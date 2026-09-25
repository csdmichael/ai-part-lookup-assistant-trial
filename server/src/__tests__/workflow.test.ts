import request from 'supertest';
import { createTestContext, type TestContext } from './testContext';

/**
 * End-to-end coverage of the main workflow: search a part, open the unified view,
 * update the stock figures, and confirm the change is persisted and audited.
 */
describe('main part lookup workflow', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    ctx.db.close();
  });

  it('completes search, review and update from start to finish', async () => {
    const health = await request(ctx.app).get('/api/health');
    expect(health.body.status).toBe('ok');

    const search = await request(ctx.app).post('/api/parts/search').send({ query: 'filter' });
    expect(search.status).toBe(200);
    const [match] = search.body.results;
    expect(match.partNumber).toBe('FLT-19004');
    expect(match.inventoryLevel).toBe(0);

    const detail = await request(ctx.app).get(`/api/parts/${match.partNumber}`);
    expect(detail.status).toBe(200);
    expect(detail.body.purchaseOrders[0].expectedDeliveryDate).toBe('2026-09-29');

    const update = await request(ctx.app)
      .put(`/api/parts/${match.partNumber}`)
      .set('x-user-id', 'engineer.sam')
      .send({ inventoryLevel: 100, reorderPoint: 30 });
    expect(update.status).toBe(200);
    expect(update.body.success).toBe(true);

    const refreshed = await request(ctx.app).get(`/api/parts/${match.partNumber}`);
    expect(refreshed.body).toMatchObject({ inventoryLevel: 100, reorderPoint: 30 });

    const audit = ctx.db.prepare('SELECT entity_id, changed_fields, actor FROM audit_log').all();
    expect(audit).toEqual([
      { entity_id: 'FLT-19004', changed_fields: 'inventoryLevel,reorderPoint', actor: 'engineer.sam' }
    ]);
  });
});
