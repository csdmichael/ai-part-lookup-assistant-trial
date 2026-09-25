# Deployment guide (Dev environment)

The trial application is deployed as a single Azure App Service (Linux, Node 22) that serves both the API
and the built React UI. Azure API Management fronts the API in line with ADR-001.

## 1. Provision infrastructure

[`infra/main.bicep`](../infra/main.bicep) creates the App Service plan, the web app (system-assigned
managed identity, HTTPS only, TLS 1.2, health check on `/api/health`), a Log Analytics workspace and an
Application Insights component.

```bash
az group create --name rg-part-lookup-dev --location westeurope

az deployment group create \
  --resource-group rg-part-lookup-dev \
  --template-file infra/main.bicep \
  --parameters environmentName=dev
```

The deployment outputs `webAppName` and `webAppUrl`.

## 2. Configure GitHub for OIDC deployment

[`.github/workflows/azure-deploy.yml`](../.github/workflows/azure-deploy.yml) signs in with workload
identity federation, so no publish profile or client secret is stored in GitHub.

1. Create an app registration (or user-assigned managed identity) and add a federated credential for this
   repository and the `dev` environment.
2. Grant it the **Website Contributor** role on the resource group.
3. In the repository create a `dev` environment with these secrets and variable:

| Name | Type | Value |
|---|---|---|
| `AZURE_CLIENT_ID` | secret | Application (client) ID |
| `AZURE_TENANT_ID` | secret | Directory (tenant) ID |
| `AZURE_SUBSCRIPTION_ID` | secret | Target subscription ID |
| `AZURE_WEBAPP_NAME` | variable | `webAppName` from the Bicep output |

Adding required reviewers to the `dev` environment gates deployments behind approval.

## 3. Deploy

The workflow runs on pushes to `main` and on demand. It installs dependencies, builds both workspaces,
runs the test suites, assembles the App Service bundle and deploys it:

```text
package/
  dist/         compiled API (entry point dist/server.js)
  wwwroot/      built React application, served through STATIC_DIR
  node_modules/ production dependencies only
  package.json
```

Application settings applied by the Bicep template:

| Setting | Value |
|---|---|
| `PORT` | `8080` |
| `STATIC_DIR` | `/home/site/wwwroot/wwwroot` |
| `DATABASE_FILE` | `/home/data/part-lookup.sqlite` (persistent `/home` volume) |
| `ALLOWED_ORIGINS` | empty for same-host hosting; set when the UI is hosted separately |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` (the package is pre-built) |

The database file is created and seeded with the sample data on first start. Deleting the file resets the
environment to the seed data.

## 4. Publish through API Management

1. Import [`openapi.yaml`](../openapi.yaml) into your API Management instance and point the backend at the
   App Service URL.
2. Apply [`infra/apim-policy.xml`](../infra/apim-policy.xml) at the API scope. It adds CORS, rate limiting
   (120 calls/minute), a daily quota, HSTS, removal of `X-Powered-By`, and a generic error body so backend
   exceptions are never surfaced to callers.
3. Set the `part-lookup-ui-origin` named value to the UI origin.

## Rollback

Use deployment slots or redeploy a previous successful run from the Actions history — the deployment
package is uploaded as a build artifact and retained for seven days.

## Operations

- Health: `GET /api/health` (also used by the App Service health check).
- Logs: structured JSON on stdout, collected by App Service diagnostics and Application Insights. Sensitive
  keys are redacted before they are written.
- Audit: the `audit_log` table records who changed which fields of which part, and when.
