import request from 'supertest';
import { createTestContext, type TestContext } from './testContext';

describe('GET /api/parts/:partNumber', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    ctx.db.close();
  });

  it('returns the unified view of inventory, supplier and purchase order data', async () => {
    const response = await request(ctx.app).get('/api/parts/MTR-40920');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      partNumber: 'MTR-40920',
      inventoryLevel: 7,
      reorderPoint: 10,
      warehouseLocation: 'WH1-D-01-2',
      lifecycleStatus: 'active',
      supplier: { name: 'Kyoto Seimitsu Co., Ltd.', country: 'Japan' }
    });
    expect(response.body.purchaseOrders).toHaveLength(2);
    expect(response.body.purchaseOrders[0]).toMatchObject({
      poNumber: 'PO-2026-004244',
      expectedDeliveryDate: '2026-10-02',
      status: 'in-transit'
    });
  });

  it('masks commercially sensitive fields in the response payload', async () => {
    const response = await request(ctx.app).get('/api/parts/BRG-22045');

    expect(response.body.sensitiveFields).toEqual({ unitCostUsd: 'MASKED', internalNotes: 'MASKED' });
    expect(response.body.purchaseOrders.every((po: { unitPriceUsd: string }) => po.unitPriceUsd === 'MASKED')).toBe(
      true
    );
    expect(response.body.supplier.contactEmail).toBe('o*****@acme-precision.example.com');
    expect(response.body.supplier.contactPhone).toBe('***-***-42');
    expect(JSON.stringify(response.body)).not.toContain('procurement desk 4');
  });

  it('is case insensitive on the part number', async () => {
    const response = await request(ctx.app).get('/api/parts/brg-22045');

    expect(response.status).toBe(200);
    expect(response.body.partNumber).toBe('BRG-22045');
  });

  it('returns a clear message when the part does not exist', async () => {
    const response = await request(ctx.app).get('/api/parts/ABC-99999');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({
      code: 'not_found',
      message: 'No part found for "ABC-99999"'
    });
  });

  it('rejects malformed part numbers before touching the database', async () => {
    const response = await request(ctx.app).get('/api/parts/not-a-part');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].message).toBe('Part number must look like ABC-12345');
  });

  it('returns a structured error for unknown routes', async () => {
    const response = await request(ctx.app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });
});
