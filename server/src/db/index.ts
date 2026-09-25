import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Part, PurchaseOrder, Supplier } from '../domain/types';

export type Db = Database.Database;

interface SeedFile {
  suppliers: Supplier[];
  parts: Part[];
  purchaseOrders: PurchaseOrder[];
}

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, '..', 'data', 'seed-parts.json');

export function readSeedData(seedPath: string = SEED_PATH): SeedFile {
  return JSON.parse(fs.readFileSync(seedPath, 'utf8')) as SeedFile;
}

function applySchema(db: Db): void {
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
}

/** Loads the realistic sample data set. Existing rows are replaced so the database can be reset. */
export function seedDatabase(db: Db, seed: SeedFile = readSeedData()): void {
  const insertSupplier = db.prepare(
    `INSERT OR REPLACE INTO suppliers (id, name, contact_email, contact_phone, country, quality_rating)
     VALUES (@id, @name, @contactEmail, @contactPhone, @country, @qualityRating)`
  );
  const insertPart = db.prepare(
    `INSERT OR REPLACE INTO parts (
       part_number, part_name, description, category, unit_of_measure, inventory_level, reorder_point,
       warehouse_location, lifecycle_status, unit_cost_usd, internal_notes, supplier_id, updated_at)
     VALUES (
       @partNumber, @partName, @description, @category, @unitOfMeasure, @inventoryLevel, @reorderPoint,
       @warehouseLocation, @lifecycleStatus, @unitCostUsd, @internalNotes, @supplierId, @updatedAt)`
  );
  const insertPo = db.prepare(
    `INSERT OR REPLACE INTO purchase_orders (
       po_number, part_number, quantity, unit_price_usd, status, order_date, expected_delivery_date)
     VALUES (@poNumber, @partNumber, @quantity, @unitPriceUsd, @status, @orderDate, @expectedDeliveryDate)`
  );

  const load = db.transaction((data: SeedFile) => {
    data.suppliers.forEach((supplier) => insertSupplier.run(supplier));
    data.parts.forEach((part) => insertPart.run(part));
    data.purchaseOrders.forEach((po) => insertPo.run(po));
  });

  load(seed);
}

export interface CreateDatabaseOptions {
  /** SQLite file path, or ':memory:' for an ephemeral database (used by tests). */
  file?: string;
  seed?: boolean;
}

export function createDatabase(options: CreateDatabaseOptions = {}): Db {
  const { file = ':memory:', seed = true } = options;

  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applySchema(db);

  if (seed) {
    const partCount = db.prepare('SELECT COUNT(*) AS count FROM parts').get() as { count: number };
    if (partCount.count === 0) {
      seedDatabase(db);
    }
  }

  return db;
}
