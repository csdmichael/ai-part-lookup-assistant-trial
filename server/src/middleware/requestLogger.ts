import type { NextFunction, Request, Response } from 'express';
import type { Logger } from '../observability/logger';

/** Logs one structured line per request. Query strings and bodies are deliberately not logged. */
export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startedAt = Date.now();
    res.on('finish', () => {
      logger.info('request.completed', {
        method: req.method,
        route: req.route?.path ?? req.path,
        status: res.statusCode,
        durationMs: Date.now() - startedAt
      });
    });
    next();
  };
}
