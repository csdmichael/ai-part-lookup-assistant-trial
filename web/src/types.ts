export type LifecycleStatus = 'active' | 'obsolete' | 'pending-approval' | 'restricted';

export interface PartSummary {
  partNumber: string;
  partName: string;
  category: string;
  inventoryLevel: number;
  reorderPoint: number;
  lifecycleStatus: LifecycleStatus;
  supplierName: string;
  nextDeliveryDate: string | null;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: PartSummary[];
}

export interface PartDetail {
  partNumber: string;
  partName: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  inventoryLevel: number;
  reorderPoint: number;
  warehouseLocation: string;
  lifecycleStatus: LifecycleStatus;
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
    status: string;
    orderDate: string;
    expectedDeliveryDate: string;
    unitPriceUsd: string;
  }>;
  sensitiveFields: {
    unitCostUsd: string;
    internalNotes: string;
  };
}

export interface PartUpdate {
  inventoryLevel: number;
  reorderPoint: number;
  warehouseLocation: string;
  lifecycleStatus: LifecycleStatus;
}

export interface FieldError {
  field: string;
  message: string;
}
