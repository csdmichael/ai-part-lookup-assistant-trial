import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express, { type Express } from 'express';
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
}

export function createApp({ db, logger = defaultLogger, allowedOrigins = [], staticDir }: CreateAppOptions): Express {
  const app = express();
  const service = new PartService(new PartRepository(db), logger);

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));
  app.use(express.json({ limit: '32kb' }));
  app.use(requestLogger(logger));

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
