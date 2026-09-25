import request from 'supertest';
import { createTestContext, type TestContext } from './testContext';

describe('PUT /api/parts/:partNumber', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    ctx.db.close();
  });

  it('saves permitted changes and confirms the update', async () => {
    const response = await request(ctx.app)
      .put('/api/parts/SEN-70310')
      .set('x-user-id', 'engineer.jane')
      .send({ inventoryLevel: 75, reorderPoint: 60, warehouseLocation: 'WH1-C-04-2' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Part SEN-70310 was updated'
    });
    expect(response.body.part).toMatchObject({
      inventoryLevel: 75,
      reorderPoint: 60,
      warehouseLocation: 'WH1-C-04-2'
    });

    const reloaded = await request(ctx.app).get('/api/parts/SEN-70310');
    expect(reloaded.body.inventoryLevel).toBe(75);
    expect(reloaded.body.updatedAt).not.toBe('2026-09-02T14:45:00.000Z');
  });

  it('writes an audit entry naming the actor and the changed fields', async () => {
    await request(ctx.app).put('/api/parts/GSK-11876').set('x-user-id', 'engineer.jane').send({ inventoryLevel: 700 });

    const audit = ctx.db.prepare('SELECT * FROM audit_log').all() as Array<Record<string, string>>;
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      entity_type: 'part',
      entity_id: 'GSK-11876',
      action: 'update',
      changed_fields: 'inventoryLevel',
      actor: 'engineer.jane'
    });
  });

  it('falls back to an anonymous actor when the user header is missing or malformed', async () => {
    await request(ctx.app).put('/api/parts/GSK-11876').set('x-user-id', 'bad actor <script>').send({ reorderPoint: 210 });

    const audit = ctx.db.prepare('SELECT actor FROM audit_log').all() as Array<{ actor: string }>;
    expect(audit[0].actor).toBe('anonymous-engineer');
  });

  it.each([
    [{ inventoryLevel: -5 }, 'Inventory level cannot be negative'],
    [{ inventoryLevel: 4.5 }, 'Inventory level must be a whole number'],
    [{ inventoryLevel: 'many' }, 'Inventory level must be a number'],
    [{ warehouseLocation: 'WH1 C 04' }, 'Warehouse location may only contain letters, numbers and hyphens'],
    [{ lifecycleStatus: 'scrapped' }, 'Lifecycle status is not a recognised value'],
    [{}, 'Provide at least one field to update']
  ])('rejects invalid input %p', async (payload, expectedMessage) => {
    const response = await request(ctx.app).put('/api/parts/GSK-11876').send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
    expect(response.body.error.details.map((detail: { message: string }) => detail.message)).toContain(
      expectedMessage
    );
  });

  it('refuses updates that try to write sensitive fields', async () => {
    const response = await request(ctx.app)
      .put('/api/parts/GSK-11876')
      .send({ inventoryLevel: 620, unitCostUsd: 0.01, internalNotes: 'overwrite' });

    expect(response.status).toBe(400);
    const stored = ctx.db.prepare('SELECT unit_cost_usd FROM parts WHERE part_number = ?').get('GSK-11876') as {
      unit_cost_usd: number;
    };
    expect(stored.unit_cost_usd).toBe(3.15);
  });

  it('enforces the cross-field rule that obsolete parts are not reordered', async () => {
    const response = await request(ctx.app).put('/api/parts/VLV-77320').send({ reorderPoint: 25 });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0]).toEqual({
      field: 'reorderPoint',
      message: 'Obsolete parts must have a reorder point of 0'
    });
  });

  it('returns 404 for a part that does not exist', async () => {
    const response = await request(ctx.app).put('/api/parts/ZZZ-00001').send({ inventoryLevel: 1 });

    expect(response.status).toBe(404);
  });

  it('returns a helpful error for malformed JSON bodies', async () => {
    const response = await request(ctx.app)
      .put('/api/parts/GSK-11876')
      .set('content-type', 'application/json')
      .send('{"inventoryLevel":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('invalid_json');
  });
});
