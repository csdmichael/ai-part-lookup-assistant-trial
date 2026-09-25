import type { PartAggregate, PartDetailView, PartSummaryView } from '../domain/types';

export const MASKED_VALUE = 'MASKED';

/**
 * Masks a contact email so engineers can still recognise the supplier mailbox
 * without the full address being exposed in the UI, API payloads or logs.
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain || localPart.length === 0) {
    return MASKED_VALUE;
  }
  const visible = localPart.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(localPart.length - 1, 1))}@${domain}`;
}

/** Masks all but the last two digits of a phone number. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 3) {
    return MASKED_VALUE;
  }
  return `***-***-${digits.slice(-2)}`;
}

/** Commercially sensitive values are never returned to clients in this trial application. */
export function toPartDetailView(part: PartAggregate): PartDetailView {
  return {
    partNumber: part.partNumber,
    partName: part.partName,
    description: part.description,
    category: part.category,
    unitOfMeasure: part.unitOfMeasure,
    inventoryLevel: part.inventoryLevel,
    reorderPoint: part.reorderPoint,
    warehouseLocation: part.warehouseLocation,
    lifecycleStatus: part.lifecycleStatus,
    updatedAt: part.updatedAt,
    supplier: {
      id: part.supplier.id,
      name: part.supplier.name,
      contactEmail: maskEmail(part.supplier.contactEmail),
      contactPhone: maskPhone(part.supplier.contactPhone),
      country: part.supplier.country,
      qualityRating: part.supplier.qualityRating
    },
    purchaseOrders: part.purchaseOrders.map((po) => ({
      poNumber: po.poNumber,
      quantity: po.quantity,
      status: po.status,
      orderDate: po.orderDate,
      expectedDeliveryDate: po.expectedDeliveryDate,
      unitPriceUsd: MASKED_VALUE
    })),
    sensitiveFields: {
      unitCostUsd: MASKED_VALUE,
      internalNotes: MASKED_VALUE
    }
  };
}

/**
 * Earliest expected delivery date across purchase orders that have not been received or cancelled.
 * Dates in the past are deliberately included: an overdue delivery is exactly what an engineer
 * chasing stock needs to see first.
 */
function nextDeliveryDate(part: PartAggregate): string | null {
  const pending = part.purchaseOrders
    .filter((po) => po.status === 'open' || po.status === 'confirmed' || po.status === 'in-transit')
    .map((po) => po.expectedDeliveryDate)
    .sort();

  return pending[0] ?? null;
}

export function toPartSummaryView(part: PartAggregate): PartSummaryView {
  return {
    partNumber: part.partNumber,
    partName: part.partName,
    category: part.category,
    inventoryLevel: part.inventoryLevel,
    reorderPoint: part.reorderPoint,
    lifecycleStatus: part.lifecycleStatus,
    supplierName: part.supplier.name,
    nextDeliveryDate: nextDeliveryDate(part)
  };
}
