# Testing strategy

Automated tests cover the main workflow end to end — search, review, update, and the feedback shown for
successful and unsuccessful actions — as required by Epic 4 of the approved plan.

```bash
npm test                      # both suites
npm test --workspace server   # API suite (Jest + Supertest)
npm test --workspace web      # UI suite (Jest + Testing Library + jsdom)
```

Coverage reports can be produced with `npm test --workspace server -- --coverage`.

## API suite (`server/src/__tests__`)

| File | What it protects |
|---|---|
| `workflow.test.ts` | The full workflow: health check, search, open the unified record, update, re-read, audit row |
| `partsSearch.test.ts` | Search by number/name/category/supplier, next delivery date, empty results, short queries, log hygiene |
| `partsDetail.test.ts` | Unified record contents, masking, case-insensitive lookup, 404 and malformed part numbers |
| `partsUpdate.test.ts` | Successful updates, audit entries, actor sanitisation, every validation rule, rejected sensitive fields, malformed JSON |
| `masking.test.ts` | Masking helpers, detail view redaction and the logger redaction rules |
| `rateLimit.test.ts` | Per-IP request throttling returns `429` with the standard error envelope |

Each test builds an isolated in-memory SQLite database seeded with the sample data
(`createTestContext()` in `testContext.ts`), so tests are independent and repeatable.

## UI suite (`web/src/__tests__`)

| File | What it protects |
|---|---|
| `App.test.tsx` | Search → review → update happy path, "no results" messaging, server validation surfaced in the UI, network failure messaging, and that masked values are never rendered |
| `validation.test.tsx` | Client-side search and update validation, including the obsolete/reorder-point rule, and that invalid forms are never submitted |

The tests drive the real components and the real API client through a `fetch` double, so request shapes
and response handling are exercised rather than mocked away.

## Accessibility and responsiveness

Component tests query by role and label (`getByLabelText`, `getByRole`), which fails if the accessible
names or ARIA attributes regress. Layout adapts through CSS grid/flex breakpoints at 640 px and 900 px;
tables collapse into labelled rows on small screens. Verify visually with the browser device toolbar after
`npm run dev`.

## Continuous integration

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs `npm ci`, `npm run lint`, `npm run build`,
`npm test` and `npm audit --audit-level=high` on every push to `main` and every pull request.
