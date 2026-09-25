import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../app';
import { createDatabase, type Db } from '../db';
import { Logger, type LogLevel } from '../observability/logger';

interface CapturedLog {
  level: LogLevel;
  entry: Record<string, unknown>;
}

export interface TestContext {
  app: Express;
  db: Db;
  logs: CapturedLog[];
}

export function createTestContext(): TestContext {
  const logs: CapturedLog[] = [];
  const logger = new Logger({
    write: (level, entry) => {
      logs.push({ level, entry });
    }
  });
  const db = createDatabase({ file: ':memory:' });

  return { app: createApp({ db, logger }), db, logs };
}

export const api = (app: Express) => request(app);
