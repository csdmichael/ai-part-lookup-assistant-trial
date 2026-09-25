import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import type { Db } from './db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import type { Logger } from './observability/logger';
import { logger as defaultLogger } from './observability/logger';
import { PartRepository } from './repositories/partRepository';
import { createPartsRouter } from './routes/parts';
import { PartService } from './services/partService';

export interface CreateAppOptions {
  db: Db;
  logger?: Logger;
  allowedOrigins?: string[];
  /** Optional directory with the built React app; enables single-host deployment. */
  staticDir?: string;
  /** Maximum requests per client IP per minute. API Management applies its own quota on top. */
  requestsPerMinute?: number;
}

export function createApp({
  db,
  logger = defaultLogger,
  allowedOrigins = [],
  staticDir,
  requestsPerMinute = 600
}: CreateAppOptions): Express {
  const app = express();
  const service = new PartService(new PartRepository(db), logger);

  app.disable('x-powered-by');
  app.use(helmet());
  // CORS runs first so throttled (429) responses still carry the headers the browser needs, and the
  // request logger runs before throttling so rejected requests remain visible in operations.
  app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));
  app.use(requestLogger(logger));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: requestsPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: {
        error: { code: 'rate_limited', message: 'Too many requests. Please wait and try again.', details: [] }
      }
    })
  );
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/parts', createPartsRouter(service));

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler(logger));

  return app;
}
