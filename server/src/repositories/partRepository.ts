import type { Db } from '../db';
import type { Part, PartAggregate, PartUpdateInput, PurchaseOrder, Supplier } from '../domain/types';

interface PartRow {
  part_number: string;
  part_name: string;
  description: string;
  category: string;
  unit_of_measure: string;
  inventory_level: number;
  reorder_point: number;
  warehouse_location: string;
  lifecycle_status: Part['lifecycleStatus'];
  unit_cost_usd: number;
  internal_notes: string;
  supplier_id: string;
  updated_at: string;
  supplier_name: string;
  contact_email: string;
  contact_phone: string;
  country: string;
  quality_rating: number;
}

interface PurchaseOrderRow {
  po_number: string;
  part_number: string;
  quantity: number;
  unit_price_usd: number;
  status: PurchaseOrder['status'];
  order_date: string;
  expected_delivery_date: string;
}

const PART_SELECT = `
  SELECT p.*, s.name AS supplier_name, s.contact_email, s.contact_phone, s.country, s.quality_rating
  FROM parts p
  JOIN suppliers s ON s.id = p.supplier_id
`;

const UPDATABLE_COLUMNS: Record<keyof PartUpdateInput, string> = {
  inventoryLevel: 'inventory_level',
  reorderPoint: 'reorder_point',
  warehouseLocation: 'warehouse_location',
  lifecycleStatus: 'lifecycle_status'
};

function toSupplier(row: PartRow): Supplier {
  return {
    id: row.supplier_id,
    name: row.supplier_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    country: row.country,
    qualityRating: row.quality_rating
  };
}

function toPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
  return {
    poNumber: row.po_number,
    partNumber: row.part_number,
    quantity: row.quantity,
    unitPriceUsd: row.unit_price_usd,
    status: row.status,
    orderDate: row.order_date,
    expectedDeliveryDate: row.expected_delivery_date
  };
}

export class PartRepository {
  constructor(private readonly db: Db) {}

  /**
   * Case-insensitive search across part number, part name, category and supplier name.
   * The query is always bound as a parameter so user input can never alter the statement.
   */
  search(query: string, limit = 25): PartAggregate[] {
    const pattern = `%${query.trim().toLowerCase()}%`;
    const rows = this.db
      .prepare(
        `${PART_SELECT}
         WHERE lower(p.part_number) LIKE @pattern
            OR lower(p.part_name) LIKE @pattern
            OR lower(p.category) LIKE @pattern
            OR lower(s.name) LIKE @pattern
         ORDER BY p.part_number
         LIMIT @limit`
      )
      .all({ pattern, limit }) as PartRow[];

    return rows.map((row) => this.hydrate(row));
  }

  findByPartNumber(partNumber: string): PartAggregate | null {
    const row = this.db
      .prepare(`${PART_SELECT} WHERE upper(p.part_number) = upper(@partNumber)`)
      .get({ partNumber }) as PartRow | undefined;

    return row ? this.hydrate(row) : null;
  }

  /** Applies the allow-listed updates and returns the refreshed aggregate, or null when unknown. */
  update(partNumber: string, changes: PartUpdateInput, updatedAt: string): PartAggregate | null {
    const entries = Object.entries(changes).filter(([, value]) => value !== undefined) as Array<
      [keyof PartUpdateInput, string | number]
    >;

    if (entries.length === 0) {
      return this.findByPartNumber(partNumber);
    }

    const assignments = entries.map(([field]) => `${UPDATABLE_COLUMNS[field]} = @${field}`).join(', ');
    const params: Record<string, string | number> = { partNumber, updatedAt };
    entries.forEach(([field, value]) => {
      params[field] = value;
    });

    const result = this.db
      .prepare(
        `UPDATE parts SET ${assignments}, updated_at = @updatedAt WHERE upper(part_number) = upper(@partNumber)`
      )
      .run(params);

    if (result.changes === 0) {
      return null;
    }

    return this.findByPartNumber(partNumber);
  }

  recordAudit(entry: {
    entityType: string;
    entityId: string;
    action: string;
    changedFields: string[];
    actor: string;
    createdAt: string;
  }): void {
    this.db
      .prepare(
        `INSERT INTO audit_log (entity_type, entity_id, action, changed_fields, actor, created_at)
         VALUES (@entityType, @entityId, @action, @changedFields, @actor, @createdAt)`
      )
      .run({ ...entry, changedFields: entry.changedFields.join(',') });
  }

  private hydrate(row: PartRow): PartAggregate {
    const purchaseOrders = this.db
      .prepare('SELECT * FROM purchase_orders WHERE part_number = ? ORDER BY expected_delivery_date')
      .all(row.part_number) as PurchaseOrderRow[];

    return {
      partNumber: row.part_number,
      partName: row.part_name,
      description: row.description,
      category: row.category,
      unitOfMeasure: row.unit_of_measure,
      inventoryLevel: row.inventory_level,
      reorderPoint: row.reorder_point,
      warehouseLocation: row.warehouse_location,
      lifecycleStatus: row.lifecycle_status,
      unitCostUsd: row.unit_cost_usd,
      internalNotes: row.internal_notes,
      supplierId: row.supplier_id,
      updatedAt: row.updated_at,
      supplier: toSupplier(row),
      purchaseOrders: purchaseOrders.map(toPurchaseOrder)
    };
  }
}
