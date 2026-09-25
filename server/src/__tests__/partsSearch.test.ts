import { createTestContext, type TestContext } from './testContext';
import request from 'supertest';

describe('GET/POST /api/parts search', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    ctx.db.close();
  });

  it('finds parts by part number fragment', async () => {
    const response = await request(ctx.app).get('/api/parts').query({ query: 'BRG-220' });

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.results[0]).toMatchObject({
      partNumber: 'BRG-22045',
      partName: 'Deep groove ball bearing 45 mm',
      supplierName: 'Acme Precision Components'
    });
  });

  it('finds parts by name, category or supplier and surfaces the next delivery date', async () => {
    const response = await request(ctx.app).post('/api/parts/search').send({ query: 'servo' });

    expect(response.status).toBe(200);
    expect(response.body.results.map((part: { partNumber: string }) => part.partNumber)).toEqual(
      expect.arrayContaining(['MTR-40920', 'CBL-60277'])
    );
    const motor = response.body.results.find((part: { partNumber: string }) => part.partNumber === 'MTR-40920');
    expect(motor.nextDeliveryDate).toBe('2026-10-02');
  });

  it('returns an empty result set rather than an error when nothing matches', async () => {
    const response = await request(ctx.app).get('/api/parts').query({ query: 'does-not-exist' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ count: 0, results: [] });
  });

  it('rejects queries that are too short with a field level message', async () => {
    const response = await request(ctx.app).get('/api/parts').query({ query: 'a' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
    expect(response.body.error.details).toEqual([
      { field: 'query', message: 'Enter at least 2 characters to search' }
    ]);
  });

  it('never logs the values of sensitive fields', async () => {
    await request(ctx.app).get('/api/parts').query({ query: 'bearing' });

    const serialised = JSON.stringify(ctx.logs);
    expect(serialised).not.toContain('18.42');
    expect(serialised).not.toContain('procurement desk 4');
  });
});
