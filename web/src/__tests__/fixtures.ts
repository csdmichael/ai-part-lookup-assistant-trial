import type { PartDetail, PartSummary } from '../types';

export const bearingSummary: PartSummary = {
  partNumber: 'BRG-22045',
  partName: 'Deep groove ball bearing 45 mm',
  category: 'Bearings',
  inventoryLevel: 184,
  reorderPoint: 60,
  lifecycleStatus: 'active',
  supplierName: 'Acme Precision Components',
  nextDeliveryDate: '2026-10-06'
};

export const bearingDetail: PartDetail = {
  partNumber: 'BRG-22045',
  partName: 'Deep groove ball bearing 45 mm',
  description: 'Sealed deep groove ball bearing, 45 mm bore.',
  category: 'Bearings',
  unitOfMeasure: 'EA',
  inventoryLevel: 184,
  reorderPoint: 60,
  warehouseLocation: 'WH1-A-12-3',
  lifecycleStatus: 'active',
  updatedAt: '2026-08-14T09:12:00.000Z',
  supplier: {
    id: 'SUP-1001',
    name: 'Acme Precision Components',
    contactEmail: 'o*****@acme-precision.example.com',
    contactPhone: '***-***-42',
    country: 'United States',
    qualityRating: 4.6
  },
  purchaseOrders: [
    {
      poNumber: 'PO-2026-004182',
      quantity: 120,
      status: 'confirmed',
      orderDate: '2026-09-01',
      expectedDeliveryDate: '2026-10-06',
      unitPriceUsd: 'MASKED'
    }
  ],
  sensitiveFields: { unitCostUsd: 'MASKED', internalNotes: 'MASKED' }
};

export interface StubResponse {
  status: number;
  body: unknown;
}

/** Minimal fetch double so component tests exercise the real API client code path. */
export function installFetchStub(handler: (url: string, init?: RequestInit) => StubResponse): jest.Mock {
  const mock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { status, body } = handler(String(input), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body
    } as Response;
  });

  global.fetch = mock as unknown as typeof fetch;
  return mock as unknown as jest.Mock;
}
