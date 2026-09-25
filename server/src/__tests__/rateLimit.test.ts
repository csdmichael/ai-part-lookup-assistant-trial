import request from 'supertest';
import { createApp } from '../app';
import { createDatabase } from '../db';
import { Logger } from '../observability/logger';

describe('request throttling', () => {
  it('rejects clients that exceed the per-minute limit and logs the outcome', async () => {
    const db = createDatabase({ file: ':memory:' });
    const entries: Array<Record<string, unknown>> = [];
    const app = createApp({
      db,
      logger: new Logger({ write: (_level, entry) => entries.push(entry) }),
      requestsPerMinute: 2
    });

    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/health').expect(200);
    const blocked = await request(app).get('/api/health');

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('rate_limited');
    expect(entries.some((entry) => entry.message === 'request.completed' && entry.status === 429)).toBe(true);

    db.close();
  });
});
