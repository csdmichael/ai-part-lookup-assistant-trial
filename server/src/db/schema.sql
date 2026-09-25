PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS suppliers (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  contact_email  TEXT NOT NULL,
  contact_phone  TEXT NOT NULL,
  country        TEXT NOT NULL,
  quality_rating REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS parts (
  part_number        TEXT PRIMARY KEY,
  part_name          TEXT NOT NULL,
  description        TEXT NOT NULL,
  category           TEXT NOT NULL,
  unit_of_measure    TEXT NOT NULL,
  inventory_level    INTEGER NOT NULL,
  reorder_point      INTEGER NOT NULL,
  warehouse_location TEXT NOT NULL,
  lifecycle_status   TEXT NOT NULL,
  unit_cost_usd      REAL NOT NULL,
  internal_notes     TEXT NOT NULL DEFAULT '',
  supplier_id        TEXT NOT NULL REFERENCES suppliers(id),
  updated_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  po_number              TEXT PRIMARY KEY,
  part_number            TEXT NOT NULL REFERENCES parts(part_number),
  quantity               INTEGER NOT NULL,
  unit_price_usd         REAL NOT NULL,
  status                 TEXT NOT NULL,
  order_date             TEXT NOT NULL,
  expected_delivery_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type    TEXT NOT NULL,
  entity_id      TEXT NOT NULL,
  action         TEXT NOT NULL,
  changed_fields TEXT NOT NULL,
  actor          TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parts_name ON parts(part_name);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_part ON purchase_orders(part_number);
