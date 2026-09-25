import request from 'supertest';
import { createApp } from '../app';
import { createDatabase } from '../db';
import { Logger } from '../observability/logger';

describe('request throttling', () => {
  it('rejects clients that exceed the per-minute limit', async () => {
    const db = createDatabase({ file: ':memory:' });
    const app = createApp({
      db,
      logger: new Logger({ write: () => undefined }),
      requestsPerMinute: 2
    });

    await request(app).get('/api/health').expect(200);
    await request(app).get('/api/health').expect(200);
    const blocked = await request(app).get('/api/health');

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('rate_limited');

    db.close();
  });
});
