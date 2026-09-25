import { createApp } from './app';
import { config } from './config';
import { createDatabase } from './db';
import { logger } from './observability/logger';

const db = createDatabase({ file: config.databaseFile });
const app = createApp({
  db,
  logger,
  allowedOrigins: config.allowedOrigins,
  staticDir: config.staticDir
});

const server = app.listen(config.port, () => {
  logger.info('server.started', { port: config.port, environment: config.nodeEnv });
});

function shutdown(signal: string): void {
  logger.info('server.stopping', { signal });
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
