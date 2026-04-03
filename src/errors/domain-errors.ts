export type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

export abstract class DomainError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND' as const;
  readonly statusCode = 404;

  constructor(resource: string, id: string) {
    super(`${resource} with id '${id}' was not found`);
  }
}

export class FundNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Fund', id);
  }
}

export class InvestorNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Investor', id);
  }
}

export class DuplicateEmailError extends DomainError {
  readonly code = 'CONFLICT' as const;
  readonly statusCode = 409;

  constructor(email: string) {
    super(`An investor with email '${email}' already exists`);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR' as const;
  readonly statusCode = 400;

  constructor(
    message: string,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
  }
}

export class InfrastructureError extends DomainError {
  readonly code = 'INTERNAL_ERROR' as const;
  readonly statusCode = 500;

  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
  }
}
