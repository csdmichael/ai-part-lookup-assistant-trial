# ai-part-lookup-assistant-trial

Engineers often need information about a part but must search across multiple systems to find inventory
levels, supplier details, purchase orders, and delivery dates. This process is time-consuming and delays
decision-making.

The AI Part Lookup Assistant brings those records together into a single search-and-review workflow:
search a part, review the unified record (inventory, supplier, purchase orders, delivery dates), update the
fields you are allowed to change, and get clear feedback for every action.

## Architecture at a glance

| Layer | Technology | Location |
|---|---|---|
| UI | React 19 + TypeScript, Vite, responsive CSS | [`web/`](web) |
| API | Node.js + Express 5 + TypeScript, Zod validation | [`server/`](server) |
| Data | SQLite (`better-sqlite3`) seeded from realistic sample data | [`server/src/db`](server/src/db), [`server/src/data/seed-parts.json`](server/src/data/seed-parts.json) |
| Tests | Jest, Supertest, Testing Library | `server/src/__tests__`, `web/src/__tests__` |
| Delivery | GitHub Actions CI, Azure App Service deployment, Bicep, API Management policy | [`.github/workflows`](.github/workflows), [`infra/`](infra) |

The approved design is recorded in [`docs/architecture-design.md`](docs/architecture-design.md); the
requirements and traceability matrix are in [`docs/requirements-analysis.md`](docs/requirements-analysis.md).

## Getting started

Requirements: Node.js 20 or later (22 is used in CI) and npm 10.

```bash
npm install          # installs both workspaces
npm run build        # type-checks and builds the API and the UI
npm test             # runs the API and UI test suites
```

Run the application in development (one terminal per workspace):

```bash
npm run dev --workspace server   # API on http://localhost:4000
npm run dev --workspace web      # UI on http://localhost:5173 (proxies /api to the API)
```

Run the production bundle from a single host — the API serves the built UI when `web/dist` exists:

```bash
npm run build
npm start            # http://localhost:4000
```

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API listen port |
| `DATABASE_FILE` | `<cwd>/data/part-lookup.sqlite` | SQLite database file; seeded on first start |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma separated CORS origins |
| `STATIC_DIR` | `../web/dist` | Built UI served by the API |

Requests are throttled to 600 per client IP per minute, and security headers are applied with `helmet`.

No secrets are required to run the trial application, and none are committed to the repository.

## Main workflow

1. **Search** by part number, part name, category or supplier name (minimum two characters).
2. **Review** the unified record: stock on hand, reorder point, warehouse location, lifecycle status,
   supplier details and every purchase order with its expected delivery date.
3. **Update** inventory level, reorder point, warehouse location or lifecycle status. Input is validated in
   the browser and again on the server, and every change is written to an audit log.
4. **Feedback** is shown for every outcome — success confirmations, "no results", validation messages and
   connection failures — using accessible live regions.

## Data protection

- Unit cost, internal notes and purchase order prices are masked (`MASKED`) by the API and are never sent
  to the browser.
- Supplier email and phone numbers are partially masked.
- Requests to write non-editable fields are rejected rather than silently ignored.
- Application logs are structured JSON with sensitive keys redacted; request bodies and query strings are
  not logged.

See [`docs/security.md`](docs/security.md) for the full threat model mapping.

## Documentation

- [API reference](docs/api.md) and [OpenAPI document](openapi.yaml)
- [Testing strategy](docs/testing.md)
- [Deployment guide](docs/deployment.md)
- [Security and data protection](docs/security.md)

## License

[MIT](LICENSE)
