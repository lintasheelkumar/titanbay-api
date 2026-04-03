import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '../errors/domain-errors.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Domain errors — already carry statusCode and code
  if (err instanceof DomainError) {
    const body: Record<string, unknown> = { code: err.code, message: err.message };
    if ('details' in err && err.details) body.details = err.details;
    return res.status(err.statusCode).json({ error: body });
  }

  // Zod validation errors (thrown by schema.parse in controllers/middleware)
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      },
    });
  }

  // Malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON in request body' },
    });
  }

  // Unexpected errors
  console.error('Unhandled error:', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
