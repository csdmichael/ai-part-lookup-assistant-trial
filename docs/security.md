# Security and data protection

This page maps the threat model in the approved architecture to the implementation.

## Sensitive data

| Data | Treatment | Implemented in |
|---|---|---|
| Unit cost | Replaced with `MASKED` in every response | `server/src/security/masking.ts` |
| Internal notes | Replaced with `MASKED` in every response | `server/src/security/masking.ts` |
| Purchase order unit price | Replaced with `MASKED` in every response | `server/src/security/masking.ts` |
| Supplier email | Partially masked (`o*****@domain`) | `maskEmail` |
| Supplier phone | Partially masked (`***-***-42`) | `maskPhone` |

Masking happens in the serialisation layer, so no route can return raw values by accident. Tests assert
that the masked values never appear in API responses or in the rendered UI.

## Input validation

- Every request is validated server-side with Zod schemas (`server/src/domain/validation.ts`); the browser
  applies the same rules for immediate feedback (`web/src/components/UpdatePartForm.tsx`).
- Update payloads are `strict()`: unknown keys are rejected, so sensitive or read-only fields cannot be
  written through mass assignment.
- Part numbers must match `^[A-Za-z]{3}-\d{4,6}$` before any database access occurs.
- Request bodies are limited to 32 KB.

## Injection and transport

- All SQL uses prepared statements with bound parameters; user input is never concatenated into SQL.
  Updates are restricted to an allow-list of column names.
- `helmet` sets the standard security headers and `x-powered-by` is disabled.
- CORS is closed by default and only opens for explicitly configured origins.
- App Service is provisioned with HTTPS only and TLS 1.2 minimum; API Management adds HSTS and throttling.

## Logging and audit

- Logs are structured JSON. `redact()` removes values whose key suggests cost, price, notes, email, phone,
  secrets or credentials.
- Query strings and request bodies are not logged.
- Successful updates insert an `audit_log` row with the part number, the changed field *names*, the actor
  and the timestamp. The actor comes from the `x-user-id` header and is accepted only when it matches
  `^[A-Za-z0-9._@-]{1,64}$`, which prevents log and audit injection.

## Error handling

Clients receive stable error codes and human-readable messages. Unexpected failures are logged server-side
and reported as a generic `internal_error`, so stack traces and internal details are never leaked. The API
Management `on-error` policy applies the same principle at the gateway.

## Secrets

The trial application needs no secrets: sample data is committed, and deployment uses GitHub OIDC workload
identity federation instead of stored credentials. `npm audit --audit-level=high` runs in CI.

## Known limitations of the trial

- There is no end-user authentication; the `x-user-id` header is trusted for audit purposes only. A
  production rollout should place Microsoft Entra ID authentication in front of the API (App Service
  authentication or API Management validate-jwt) and derive the actor from the token.
- Rate limiting is applied at API Management rather than in the Node process.
