import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../../errors/domain-errors.js';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(fromZodError(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(fromZodError(result.error));
      return;
    }
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(fromZodError(result.error));
      return;
    }
    next();
  };
}

function fromZodError(error: ZodError) {
  const details = error.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
  return new ValidationError('Validation failed', details);
}
