# API reference

Base URL (local development): `http://localhost:4000`. The machine readable contract is
[`openapi.yaml`](../openapi.yaml); this page summarises the behaviour and shows example payloads.

All responses are JSON. Errors share one envelope:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "The changes could not be saved",
    "details": [{ "field": "inventoryLevel", "message": "Inventory level cannot be negative" }]
  }
}
```

| Code | Status | Meaning |
|---|---|---|
| `validation_failed` | 400 | The request did not pass server-side validation |
| `invalid_json` | 400 | The request body was not valid JSON |
| `not_found` | 404 | The part or route does not exist |
| `internal_error` | 500 | Unexpected failure; details are logged server-side only |

## `GET /api/health`

Liveness probe used by the Azure App Service health check.

## `GET /api/parts?query=<text>&limit=<n>`

Searches part number, part name, category and supplier name (case-insensitive, partial matches).
`query` must be 2–64 characters; `limit` defaults to 25 and is capped at 100. A search with no matches
returns `200` with an empty `results` array so the UI can show a "no results" message rather than an error.

```bash
curl "http://localhost:4000/api/parts?query=bearing"
```

```json
{
  "query": "bearing",
  "count": 1,
  "results": [
    {
      "partNumber": "BRG-22045",
      "partName": "Deep groove ball bearing 45 mm",
      "category": "Bearings",
      "inventoryLevel": 184,
      "reorderPoint": 60,
      "lifecycleStatus": "active",
      "supplierName": "Acme Precision Components",
      "nextDeliveryDate": "2026-10-06"
    }
  ]
}
```

`nextDeliveryDate` is the earliest expected delivery date across purchase orders that are still open,
confirmed or in transit, and is `null` when there are none.

## `POST /api/parts/search`

Same behaviour as the `GET` variant, with `{ "query": "...", "limit": 25 }` in the body.

## `GET /api/parts/{partNumber}`

Returns the unified record. Part numbers match `^[A-Za-z]{3}-\d{4,6}$` and are matched
case-insensitively. Sensitive values are masked before the response is serialised.

```json
{
  "partNumber": "BRG-22045",
  "inventoryLevel": 184,
  "reorderPoint": 60,
  "warehouseLocation": "WH1-A-12-3",
  "lifecycleStatus": "active",
  "updatedAt": "2026-08-14T09:12:00.000Z",
  "supplier": {
    "name": "Acme Precision Components",
    "contactEmail": "o*****@acme-precision.example.com",
    "contactPhone": "***-***-42"
  },
  "purchaseOrders": [
    {
      "poNumber": "PO-2026-004182",
      "quantity": 120,
      "status": "confirmed",
      "orderDate": "2026-09-01",
      "expectedDeliveryDate": "2026-10-06",
      "unitPriceUsd": "MASKED"
    }
  ],
  "sensitiveFields": { "unitCostUsd": "MASKED", "internalNotes": "MASKED" }
}
```

## `PUT /api/parts/{partNumber}`

Updates the editable fields. At least one field must be supplied, and unknown fields (including
`unitCostUsd` and `internalNotes`) are rejected with `400`.

| Field | Rules |
|---|---|
| `inventoryLevel` | Integer, 0–1,000,000 |
| `reorderPoint` | Integer, 0–1,000,000; must be `0` when the lifecycle status is `obsolete` |
| `warehouseLocation` | 3–32 characters, letters, numbers and hyphens only |
| `lifecycleStatus` | `active`, `obsolete`, `pending-approval` or `restricted` |

The optional `x-user-id` header (`^[A-Za-z0-9._@-]{1,64}$`) identifies the engineer in the audit log;
anything else is recorded as `anonymous-engineer`.

```bash
curl -X PUT http://localhost:4000/api/parts/BRG-22045 \
  -H 'content-type: application/json' \
  -H 'x-user-id: engineer.jo' \
  -d '{"inventoryLevel": 190}'
```

```json
{ "success": true, "message": "Part BRG-22045 was updated", "part": { "inventoryLevel": 190 } }
```

The UI sends only the fields the engineer actually edited, so the audit trail reflects the real change.
Every successful update inserts a row into `audit_log` recording the part, the changed field names, the
actor and the timestamp. Field *values* are deliberately not stored in the audit table so that commercial
data cannot leak through it.
