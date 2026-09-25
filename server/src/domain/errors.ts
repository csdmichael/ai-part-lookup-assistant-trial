import type { FieldError } from '../domain/validation';

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: FieldError[] = []
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details: FieldError[] = []) {
    super(400, 'validation_failed', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, 'not_found', message);
    this.name = 'NotFoundError';
  }
}
