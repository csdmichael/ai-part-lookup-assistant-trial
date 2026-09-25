import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../domain/errors';
import type { Logger } from '../observability/logger';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: Array<{ field: string; message: string }>;
  };
}

/**
 * Converts thrown errors into a stable client contract. Unexpected errors are logged
 * server-side and reported generically so internal details are never leaked.
 */
export function errorHandler(logger: Logger) {
  return (error: unknown, req: Request, res: Response<ApiErrorBody>, next: NextFunction): void => {
    if (res.headersSent) {
      next(error);
      return;
    }

    if (error instanceof AppError) {
      logger.warn('request.rejected', {
        method: req.method,
        path: req.path,
        status: error.status,
        code: error.code
      });
      res.status(error.status).json({
        error: { code: error.code, message: error.message, details: error.details }
      });
      return;
    }

    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({
        error: { code: 'invalid_json', message: 'The request body is not valid JSON', details: [] }
      });
      return;
    }

    logger.error('request.failed', {
      method: req.method,
      path: req.path,
      reason: error instanceof Error ? error.message : 'unknown error'
    });
    res.status(500).json({
      error: { code: 'internal_error', message: 'Something went wrong. Please try again.', details: [] }
    });
  };
}

export function notFoundHandler(req: Request, res: Response<ApiErrorBody>): void {
  res.status(404).json({
    error: { code: 'not_found', message: `No route matches ${req.method} ${req.path}`, details: [] }
  });
}
