export interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  qualityRating: number;
}

export interface PurchaseOrder {
  poNumber: string;
  partNumber: string;
  quantity: number;
  unitPriceUsd: number;
  status: 'open' | 'confirmed' | 'in-transit' | 'received' | 'cancelled';
  orderDate: string;
  expectedDeliveryDate: string;
}

export interface Part {
  partNumber: string;
  partName: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  inventoryLevel: number;
  reorderPoint: number;
  warehouseLocation: string;
  lifecycleStatus: 'active' | 'obsolete' | 'pending-approval' | 'restricted';
  unitCostUsd: number;
  internalNotes: string;
  supplierId: string;
  updatedAt: string;
}

/** Aggregated part record, before sensitive field masking is applied. */
export interface PartAggregate extends Part {
  supplier: Supplier;
  purchaseOrders: PurchaseOrder[];
}

export interface PartSummaryView {
  partNumber: string;
  partName: string;
  category: string;
  inventoryLevel: number;
  reorderPoint: number;
  lifecycleStatus: Part['lifecycleStatus'];
  supplierName: string;
  nextDeliveryDate: string | null;
}

export interface PartDetailView {
  partNumber: string;
  partName: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  inventoryLevel: number;
  reorderPoint: number;
  warehouseLocation: string;
  lifecycleStatus: Part['lifecycleStatus'];
  updatedAt: string;
  supplier: {
    id: string;
    name: string;
    contactEmail: string;
    contactPhone: string;
    country: string;
    qualityRating: number;
  };
  purchaseOrders: Array<{
    poNumber: string;
    quantity: number;
    status: PurchaseOrder['status'];
    orderDate: string;
    expectedDeliveryDate: string;
    unitPriceUsd: string;
  }>;
  sensitiveFields: {
    unitCostUsd: string;
    internalNotes: string;
  };
}

export interface PartUpdateInput {
  inventoryLevel?: number;
  reorderPoint?: number;
  warehouseLocation?: string;
  lifecycleStatus?: Part['lifecycleStatus'];
}
