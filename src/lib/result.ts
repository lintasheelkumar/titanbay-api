import { DomainError } from '../errors/domain-errors.js';

export class Result<T, E extends DomainError = DomainError> {
  private constructor(
    private readonly _value: T | undefined,
    private readonly _error: E | undefined,
    private readonly _isOk: boolean,
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result(value, undefined, true) as Result<T, never>;
  }

  static fail<E extends DomainError>(error: E): Result<never, E> {
    return new Result(undefined, error, false) as Result<never, E>;
  }

  get isOk(): boolean {
    return this._isOk;
  }

  get isErr(): boolean {
    return !this._isOk;
  }

  get value(): T {
    if (!this._isOk) throw new Error('Cannot unwrap value of a failed Result');
    return this._value as T;
  }

  get error(): E {
    if (this._isOk) throw new Error('Cannot unwrap error of a successful Result');
    return this._error as E;
  }
}
