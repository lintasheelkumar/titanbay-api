# Titanbay API — Plan 3: Bug Fixes, Patterns & Hardening

> Addresses bugs and architectural gaps found in Plan 2 review.
> Read PLAN.md → PLAN2.md → this file in order.

---

## Table of Contents

1. [DI Tokens — Symbol Fragility Fix](#1-di-tokens--symbol-fragility-fix)
2. [Interface Naming — The I-Prefix Convention](#2-interface-naming--the-i-prefix-convention)
3. [Cache Safety — Stale Data & Type Validation](#3-cache-safety--stale-data--type-validation)
4. [Bug Fix: update Passes Full DTO With id](#4-bug-fix-update-passes-full-dto-with-id)
5. [Domain Error Types & Result Pattern](#5-domain-error-types--result-pattern)
6. [findById Contract — Throw vs Return null](#6-findbyid-contract--throw-vs-return-null)
7. [Cache Key Prefix Fragility Fix](#7-cache-key-prefix-fragility-fix)
8. [Observability — Logging on Failures, Cache Ratios](#8-observability--logging-on-failures-cache-ratios)
9. [Warm Cache After Create](#9-warm-cache-after-create)
10. [Cache Stampede Protection](#10-cache-stampede-protection)
11. [Separation of Concerns — Decorator Pattern for Caching/Logging](#11-separation-of-concerns--decorator-pattern-for-cachinglogging)
12. [Revised FundService — Clean Version](#12-revised-fundservice--clean-version)

---

## 1. DI Tokens — Symbol Fragility Fix

### The Problem

```typescript
// If you rename the interface, the string inside Symbol is now stale
export const INVESTMENT_REPOSITORY_TOKEN = Symbol('IInvestmentRepository');
```

The string inside `Symbol()` is just a debug label — it has no runtime effect.
But it's misleading if the interface gets renamed and the string doesn't follow.

### Option A: Derive Tokens From Class/Interface Names (Safest)

Use the class name itself as the token string via a helper:

```typescript
// lib/tokens.ts
export function createToken<T>(name: string): symbol & { __type?: T } {
  return Symbol.for(name) as symbol & { __type?: T };
}
```

```typescript
// repositories/interfaces/fund.repository.interface.ts
import { createToken } from '../../lib/tokens';

export interface IFundRepository {
  findAll(params: PaginationParams): Promise<{ data: Fund[]; total: number }>;
  findById(id: string): Promise<Fund | null>;
  // ...
}

// Token lives right next to the interface — you'll see both when renaming
export const IFundRepository = createToken<IFundRepository>('IFundRepository');
```

Wait — that's a name collision between the interface and the const! Actually,
in TypeScript this is a **well-known pattern called declaration merging**.
Interfaces exist only at compile time, consts exist at runtime. TypeScript
merges them:

```typescript
// This is valid TypeScript — the interface and const share the name
export interface IFundRepository { /* ... */ }
export const IFundRepository = Symbol.for('IFundRepository');

// Usage:
@inject(IFundRepository) private readonly fundRepo: IFundRepository
//       ^ runtime token (const)                    ^ compile-time type (interface)
```

This is actually how Angular and inversify recommend doing it. The token
and interface are physically the same name, so renaming one means you
rename both.

### Option B: String Literal Tokens (Simplest)

Skip Symbols entirely. tsyringe supports string tokens:

```typescript
// Just use the interface name as a string
container.register('IFundRepository', { useClass: PrismaFundRepository });

// In service:
constructor(@inject('IFundRepository') private readonly fundRepo: IFundRepository) {}
```

Pros: Dead simple, no Symbol confusion.
Cons: No uniqueness guarantee (two modules could collide on the same string).
      No autocomplete on the token.

### Option C: Token Constants Object (Most Practical)

Keep all tokens in one file. When you rename anything, this file is your
single checkpoint:

```typescript
// constants/tokens.ts
export const TOKENS = {
  // Infrastructure
  PrismaClient:   Symbol.for('PrismaClient'),
  CacheService:   Symbol.for('ICacheService'),
  Logger:         Symbol.for('ILogger'),

  // Repositories
  FundRepo:       Symbol.for('IFundRepository'),
  InvestorRepo:   Symbol.for('IInvestorRepository'),
  InvestmentRepo: Symbol.for('IInvestmentRepository'),

  // Services
  FundService:       Symbol.for('IFundService'),
  InvestorService:   Symbol.for('IInvestorService'),
  InvestmentService: Symbol.for('IInvestmentService'),
} as const;
```

Usage:
```typescript
import { TOKENS } from '../constants/tokens';

// Registration
container.register(TOKENS.FundRepo, { useClass: PrismaFundRepository });

// Injection
constructor(@inject(TOKENS.FundRepo) private readonly fundRepo: IFundRepository) {}
```

### Recommendation: Option C for this project

- All tokens visible in one file — easy to audit
- `TOKENS.FundRepo` gives autocomplete
- `Symbol.for()` (not `Symbol()`) ensures the same string always produces
  the same symbol globally — prevents subtle bugs with multiple imports
- If you rename an interface, you check `tokens.ts` — one place

### How Most People Do It

In practice, the TypeScript DI ecosystem is split:
- **inversify**: Uses `Symbol.for()` with a centralized `TYPES` constant — same as our Option C
- **tsyringe**: Uses string tokens or class references — simpler but less type-safe
- **Angular**: Uses class references directly (Angular's DI handles it)
- **NestJS**: Uses class references and `@Injectable()` — no manual tokens

Option C is the most common pattern for tsyringe/inversify projects.

---

## 2. Interface Naming — The I-Prefix Convention

### Verdict: YES, Use I-Prefix for Interfaces in This Project

TypeScript's official style guide says "don't use I-prefix" — but that
guidance is for library/framework code where consumers interact with the
types directly. For **application code with DI**, the I-prefix is valuable:

**Why the I-prefix helps here:**

1. **Instant visual distinction**: When you see `IFundRepository` in a
   constructor, you immediately know it's an interface (injected), not a
   concrete class. In a DI-heavy codebase, this matters constantly.

2. **Familiar to C# developers**: You're coming from C# where this is
   universal. The reviewers at Titanbay use TypeScript — some may come
   from C#/Java backgrounds and find I-prefix natural.

3. **Prevents name collisions**: Without the prefix, `FundRepository`
   could be the interface OR the class. With it: `IFundRepository` is
   the contract, `PrismaFundRepository` is the implementation. Zero
   ambiguity.

4. **grep/search clarity**: Searching for `IFund` finds all fund
   interfaces. Searching for `PrismaFund` finds all Prisma implementations.

**The counter-argument (and why it doesn't apply here):**

The TypeScript team argues that `I` prefix is redundant because
TypeScript's structural typing means you rarely need to distinguish.
True for utility types and simple interfaces. But for **DI service
interfaces** that have concrete implementations, the distinction is
load-bearing. NestJS, Angular, and most enterprise TS codebases use
I-prefix for service/repository interfaces even if they don't for
simple data interfaces.

### Naming Convention Summary

```
IFundRepository              ← interface (contract)
PrismaFundRepository         ← implementation (Prisma-specific)

IFundService                 ← interface (contract)
FundService                  ← implementation (business logic)

ICacheService                ← interface (contract)
NodeCacheService             ← implementation (node-cache-specific)

ILogger                      ← interface (contract)
PinoLogger                   ← implementation (pino-specific)

CreateFundDto                ← DTO type (no I-prefix, it's a data shape, not a contract)
FundResponseDto              ← DTO type (same)
PaginationParams             ← simple type (no I-prefix)
```

Rule: **I-prefix for interfaces that have injectable implementations.
No I-prefix for data types, DTOs, and simple shapes.**

---

## 3. Cache Safety — Stale Data & Type Validation

### The Problem

```typescript
// Current: no type validation, could return anything
const cached = this.cache.get(cacheKey);
if (cached) return cached;  // ← could be corrupted, wrong type, or stale
```

### Fix 1: Generic ICacheService With Runtime Type Guard

```typescript
// lib/cache.ts
export interface ICacheService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  del(key: string): void;
  invalidateByPrefix(prefix: string): void;
  flush(): void;
}
```

The generic `get<T>` provides compile-time safety, but at runtime
`node-cache` returns `unknown`. Add a validation wrapper:

```typescript
// lib/cache.ts — implementation
import NodeCache from 'node-cache';
import { CACHE_TTL_SECONDS, CACHE_CHECK_PERIOD } from '../constants/cache';

export class NodeCacheService implements ICacheService {
  private readonly cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: CACHE_TTL_SECONDS,
      checkperiod: CACHE_CHECK_PERIOD,
      useClones: false,
    });
  }

  get<T>(key: string): T | undefined {
    try {
      const value = this.cache.get<T>(key);
      if (value === undefined) return undefined;

      // Runtime check: if value is not an object/array, something is wrong
      if (typeof value !== 'object' || value === null) {
        this.cache.del(key);  // Evict corrupted entry
        return undefined;
      }

      return value;
    } catch {
      // node-cache can throw on deserialization errors
      this.cache.del(key);
      return undefined;
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      this.cache.set(key, value, ttl ?? CACHE_TTL_SECONDS);
    } catch {
      // Silently fail on cache write — DB is the source of truth
    }
  }

  del(key: string): void {
    this.cache.del(key);
  }

  invalidateByPrefix(prefix: string): void {
    const keys = this.cache.keys().filter(k => k.startsWith(prefix));
    if (keys.length > 0) this.cache.del(keys);
  }

  flush(): void {
    this.cache.flushAll();
  }
}
```

### Fix 2: Cache-Aside With Graceful Degradation

The service should **never fail** because of a cache problem. Cache is
an optimization, not a dependency:

```typescript
// Pattern: cache errors should NEVER propagate to the caller
async findAll(params: PaginationParams) {
  // Try cache — but don't trust it blindly
  try {
    const cached = this.cache.get<PaginatedResponse<FundResponseDto>>(cacheKey);
    if (cached && cached.data && Array.isArray(cached.data)) {
      return cached;  // Structurally valid
    }
  } catch {
    // Cache is broken — proceed to DB, log it
    this.logger.warn(LOG_MESSAGES.CACHE_READ_ERROR, { key: cacheKey });
  }

  // Always fall through to DB if cache fails or returns suspicious data
  const { data, total } = await this.fundRepo.findAll(params);
  // ...
}
```

---

## 4. Bug Fix: update Passes Full DTO With id

### The Bug

```typescript
async update(data: UpdateFundDto) {
  const { id, ...updateData } = data;
  const fund = await this.fundRepo.update(id, data); // BUG: should be updateData
}
```

We destructure `updateData` to separate the `id` from the fields to update,
then pass `data` (which still contains `id`) to the repository. This means
the repo receives `{ id, name, vintage_year, ... }` and tries to set `id`
as a column value — at best Prisma ignores it, at worst it errors or
overwrites the primary key.

### The Fix

```typescript
async update(data: UpdateFundDto): Promise<Result<FundResponseDto, DomainError>> {
  const { id, ...updateData } = data;

  // Check existence first (see section 6)
  const exists = await this.fundRepo.exists(id);
  if (!exists) {
    return Result.fail(new FundNotFoundError(id));
  }

  const fund = await this.fundRepo.update(id, updateData);  // ← fixed
  this.cache.del(CacheKeys.FUND_BY_ID(id));
  this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
  return Result.ok(toFundResponse(fund));
}
```

### Repository Interface Update

The repository's update signature should make this explicit:

```typescript
// IFundRepository
update(id: string, data: Omit<UpdateFundDto, 'id'>): Promise<Fund>;
```

`Omit<UpdateFundDto, 'id'>` makes it a compile-time error to pass the
id inside the data object. TypeScript enforces correctness.

---

## 5. Domain Error Types & Result Pattern

### The Problem

If `fundRepo.create` throws, the raw Prisma/DB error bubbles up through the
service to the controller. The service layer should translate infrastructure
errors into domain-meaningful errors.

### Domain Error Classes

```typescript
// errors/domain-errors.ts
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
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
  readonly code = 'CONFLICT';
  readonly statusCode = 409;

  constructor(email: string) {
    super(`An investor with email '${email}' already exists`);
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;

  constructor(message: string, public readonly details?: Array<{ field: string; message: string }>) {
    super(message);
  }
}

export class InfrastructureError extends DomainError {
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;

  constructor(message: string, public readonly cause?: Error) {
    super(message);
  }
}
```

### Result Pattern

```typescript
// lib/result.ts
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

  // Unwrap value — throws if Result is an error
  get value(): T {
    if (!this._isOk) {
      throw new Error('Cannot unwrap value of failed Result');
    }
    return this._value as T;
  }

  // Unwrap error — throws if Result is ok
  get error(): E {
    if (this._isOk) {
      throw new Error('Cannot unwrap error of successful Result');
    }
    return this._error as E;
  }
}
```

### Service Using Result Pattern

```typescript
// services/fund.service.ts
async create(data: CreateFundDto): Promise<Result<FundResponseDto, DomainError>> {
  try {
    const fund = await this.fundRepo.create(data);
    return Result.ok(toFundResponse(fund));
  } catch (err) {
    this.logger.error(LOG_MESSAGES.FUND_CREATE_FAILED, { error: (err as Error).message });

    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return Result.fail(new ValidationError('A fund with this name already exists'));
    }
    return Result.fail(new InfrastructureError('Failed to create fund', err as Error));
  }
}
```

### Controller Using Result Pattern

```typescript
// controllers/fund.controller.ts
create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createFundSchema.parse(req.body);
    const result = await this.service.create(data);

    if (result.isErr) {
      const err = result.error;
      return res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
    }

    return res.status(HTTP_STATUS.CREATED).json(result.value);
  } catch (err) {
    next(err);  // Zod errors and unexpected errors still go to middleware
  }
};
```

### C# Comparison

| C# | TypeScript (our approach) |
|---|---|
| `Result<T>` (FluentResults) | `Result<T, E>` in `lib/result.ts` |
| `DomainException : Exception` | `DomainError extends Error` |
| `NotFoundException : DomainException` | `NotFoundError extends DomainError` |
| `result.IsSuccess` | `result.isOk` |
| `result.Value` | `result.value` |
| `Result.Fail(error)` | `Result.fail(new FundNotFoundError(id))` |

---

## 6. findById Contract — Throw vs Return null

### The Problem

Returning `null` pushes null-checking to every caller. The `update` method
doesn't check existence before updating — if the repo throws, we still
invalidate cache for a fund that might not exist.

### Decision: Use Result Pattern, NOT null

```typescript
// Service interface — explicit contract
export interface IFundService {
  findById(id: string): Promise<Result<FundResponseDto, NotFoundError>>;
  // NOT: findById(id: string): Promise<FundResponseDto | null>;
}
```

### Implementation

```typescript
async findById(id: string): Promise<Result<FundResponseDto, NotFoundError>> {
  // Cache check (with safety from section 3)
  const cached = this.safeCacheGet<FundResponseDto>(CacheKeys.FUND_BY_ID(id));
  if (cached) return Result.ok(cached);

  const fund = await this.fundRepo.findById(id);
  if (!fund) {
    this.logger.debug(LOG_MESSAGES.FUND_NOT_FOUND, { id });
    return Result.fail(new FundNotFoundError(id));
  }

  const dto = toFundResponse(fund);
  this.cache.set(CacheKeys.FUND_BY_ID(id), dto, CACHE_TTL_SINGLE);
  return Result.ok(dto);
}
```

### Update — Now Checks Existence

```typescript
async update(data: UpdateFundDto): Promise<Result<FundResponseDto, DomainError>> {
  const { id, ...updateData } = data;

  // Explicitly check existence before update
  const exists = await this.fundRepo.exists(id);
  if (!exists) {
    return Result.fail(new FundNotFoundError(id));
  }

  try {
    const fund = await this.fundRepo.update(id, updateData);
    // Only invalidate cache AFTER successful update
    this.cache.del(CacheKeys.FUND_BY_ID(id));
    this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
    return Result.ok(toFundResponse(fund));
  } catch (err) {
    this.logger.error(LOG_MESSAGES.FUND_UPDATE_FAILED, { id, error: (err as Error).message });
    return Result.fail(new InfrastructureError('Failed to update fund', err as Error));
  }
}
```

### Controller — Clean Pattern Matching

```typescript
findById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await this.service.findById(req.params.id);

    if (result.isErr) {
      const err = result.error;
      return res.status(err.statusCode).json({
        error: { code: err.code, message: err.message },
      });
    }

    return res.json(result.value);
  } catch (err) {
    next(err);
  }
};
```

---

## 7. Cache Key Prefix Fragility Fix

### The Problem

```typescript
// In CacheKeys:
FUNDS_LIST: (page: number, limit: number) => `funds:list:p${page}:l${limit}`,

// In service — hardcoded string that could drift:
this.cache.invalidateByPrefix('funds:list');
```

If someone changes the prefix in `CacheKeys.FUNDS_LIST` to `fund:listings:`,
the invalidation silently stops working.

### The Fix: Extract Prefixes as Constants

```typescript
// constants/cache.ts
export const CACHE_TTL_SECONDS = 300;
export const CACHE_TTL_SINGLE = 120;
export const CACHE_CHECK_PERIOD = 60;

export const CacheKeys = {
  // Prefixes — used for invalidation
  FUNDS_LIST_PREFIX:            'funds:list',
  INVESTORS_LIST_PREFIX:        'investors:list',
  INVESTMENTS_BY_FUND_PREFIX:   'investments:fund',

  // Full keys — built from the prefix
  FUNDS_LIST:      (page: number, limit: number) =>
    `${CacheKeys.FUNDS_LIST_PREFIX}:p${page}:l${limit}`,

  FUND_BY_ID:      (id: string) => `funds:${id}`,

  INVESTORS_LIST:  (page: number, limit: number) =>
    `${CacheKeys.INVESTORS_LIST_PREFIX}:p${page}:l${limit}`,

  INVESTOR_BY_ID:  (id: string) => `investors:${id}`,

  INVESTMENTS_BY_FUND: (fundId: string, page: number, limit: number) =>
    `${CacheKeys.INVESTMENTS_BY_FUND_PREFIX}:${fundId}:p${page}:l${limit}`,
} as const;
```

### Usage — Always Reference the Constant

```typescript
// Service — no hardcoded strings
this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
this.cache.del(CacheKeys.FUND_BY_ID(id));
```

Now if someone changes the prefix, both the key builder and invalidation
update together because they reference the same constant.

---

## 8. Observability — Logging on Failures, Cache Ratios

### The Problem

Logging only on success gives you zero visibility into failures, slow
queries, or cache effectiveness.

### Add These Log Messages

```typescript
// constants/log-messages.ts — additions
export const LOG_MESSAGES = {
  // ... existing messages ...

  // Cache observability
  CACHE_HIT:          'Cache hit',
  CACHE_MISS:         'Cache miss',
  CACHE_READ_ERROR:   'Cache read failed — falling through to DB',
  CACHE_WRITE_ERROR:  'Cache write failed — continuing without cache',
  CACHE_INVALIDATED:  'Cache invalidated',

  // Operation failures
  FUND_CREATE_FAILED:    'Fund creation failed',
  FUND_UPDATE_FAILED:    'Fund update failed',
  FUND_LIST_FETCHED:     'Fund list fetched',
  INVESTOR_CREATE_FAILED: 'Investor creation failed',
  INVESTMENT_CREATE_FAILED: 'Investment creation failed',

  // Slow query detection
  SLOW_QUERY_DETECTED:  'Slow query detected',
} as const;
```

### Structured Log Pattern — Service Method

```typescript
async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<FundResponseDto>>> {
  const startTime = Date.now();
  const cacheKey = CacheKeys.FUNDS_LIST(params.page, params.limit);

  // Cache attempt with logging
  const cached = this.safeCacheGet<PaginatedResponse<FundResponseDto>>(cacheKey);
  if (cached) {
    this.logger.debug(LOG_MESSAGES.CACHE_HIT, { key: cacheKey });
    return Result.ok(cached);
  }
  this.logger.debug(LOG_MESSAGES.CACHE_MISS, { key: cacheKey });

  // DB fetch
  try {
    const { data, total } = await this.fundRepo.findAll(params);
    const duration = Date.now() - startTime;

    // Slow query detection
    if (duration > 200) {
      this.logger.warn(LOG_MESSAGES.SLOW_QUERY_DETECTED, {
        operation: 'fund.findAll',
        duration: `${duration}ms`,
        params,
      });
    }

    const response = buildPaginatedResponse(toFundResponseList(data), total, params);
    this.cache.set(cacheKey, response);

    this.logger.info(LOG_MESSAGES.FUND_LIST_FETCHED, {
      page: params.page,
      count: data.length,
      total,
      duration: `${duration}ms`,
      cacheStatus: 'miss',
    });

    return Result.ok(response);
  } catch (err) {
    this.logger.error(LOG_MESSAGES.FUND_LIST_FAILED, {
      params,
      error: (err as Error).message,
      duration: `${Date.now() - startTime}ms`,
    });
    return Result.fail(new InfrastructureError('Failed to fetch funds', err as Error));
  }
}
```

### Request-Level Correlation ID

Add a correlation ID to every request so you can trace a single request
across all log lines:

```typescript
// middleware/correlationId.ts
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function correlationId(req: Request, _res: Response, next: NextFunction) {
  req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || randomUUID();
  next();
}
```

Include in all log calls:
```typescript
this.logger.info(LOG_MESSAGES.FUND_CREATED, {
  correlationId: req.headers['x-correlation-id'],
  fundId: fund.id,
});
```

---

## 9. Warm Cache After Create

### The Problem

After creating a fund, we invalidate list caches but don't populate the
by-ID cache. The very next `findById` for the new fund is a guaranteed
cache miss — even though we already have the data.

### The Fix

```typescript
async create(data: CreateFundDto): Promise<Result<FundResponseDto, DomainError>> {
  try {
    const fund = await this.fundRepo.create(data);
    const dto = toFundResponse(fund);

    // Warm the by-ID cache with the data we already have
    this.cache.set(CacheKeys.FUND_BY_ID(fund.id), dto, CACHE_TTL_SINGLE);

    // Invalidate list caches (new item changes list results)
    this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);

    this.logger.info(LOG_MESSAGES.FUND_CREATED, { id: fund.id });
    return Result.ok(dto);
  } catch (err) {
    // ... error handling
  }
}
```

Same for `update` — after a successful update, warm the cache:

```typescript
async update(data: UpdateFundDto): Promise<Result<FundResponseDto, DomainError>> {
  const { id, ...updateData } = data;

  const exists = await this.fundRepo.exists(id);
  if (!exists) return Result.fail(new FundNotFoundError(id));

  try {
    const fund = await this.fundRepo.update(id, updateData);
    const dto = toFundResponse(fund);

    // Warm cache with fresh data (not just delete)
    this.cache.set(CacheKeys.FUND_BY_ID(id), dto, CACHE_TTL_SINGLE);
    this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);

    return Result.ok(dto);
  } catch (err) {
    // ... error handling
  }
}
```

---

## 10. Cache Stampede Protection

### The Problem

Two simultaneous `findAll` requests with the same params both miss cache,
both query the DB, and both write to cache. Under high traffic, this
creates a "thundering herd" — N requests all bypassing cache at once.

### Solution: Single-Flight Pattern

Only the first caller queries the DB. All concurrent callers wait for
that result:

```typescript
// lib/single-flight.ts
type InFlightRequest<T> = Promise<T>;

export class SingleFlight {
  private readonly inFlight = new Map<string, InFlightRequest<unknown>>();

  async do<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // If there's already a request in flight for this key, wait for it
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    // First caller — execute the function and store the promise
    const promise = fn().finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }
}
```

### Usage in Service

```typescript
import { SingleFlight } from '../lib/single-flight';

export class FundService implements IFundService {
  private readonly singleFlight = new SingleFlight();

  async findAll(params: PaginationParams) {
    const cacheKey = CacheKeys.FUNDS_LIST(params.page, params.limit);

    const cached = this.safeCacheGet<PaginatedResponse<FundResponseDto>>(cacheKey);
    if (cached) return Result.ok(cached);

    // Single-flight: only one DB query per unique cache key at a time
    const response = await this.singleFlight.do(cacheKey, async () => {
      const { data, total } = await this.fundRepo.findAll(params);
      const result = buildPaginatedResponse(toFundResponseList(data), total, params);
      this.cache.set(cacheKey, result);
      return result;
    });

    return Result.ok(response);
  }
}
```

### Is This Overkill for a Take-Home?

Maybe — but mentioning it in the README shows awareness:
> "For high-traffic endpoints, a single-flight pattern prevents cache
> stampedes. Implemented in `lib/single-flight.ts`."

We can mention this in Future Improvements section in Readme and not implement this now
---

## 11. Separation of Concerns — Decorator Pattern for Caching/Logging

### The Problem

The service is doing too many things: caching, logging, DTO mapping, error
handling, AND business logic. This violates SRP and makes the business
logic hard to read.

### Solution: Service Decorators via DI

This is where DI **really shines**. We can wrap the core service with
decorator layers that handle cross-cutting concerns:

```
Controller
    → CachingFundService (decorator — handles cache)
        → LoggingFundService (decorator — handles logging)
            → FundService (core — pure business logic)
                → IFundRepository
```

Each decorator implements `IFundService` and wraps another `IFundService`.

### Core Service — Pure Business Logic

```typescript
// services/fund.service.ts — clean, focused, testable
@injectable()
export class FundService implements IFundService {
  constructor(
    @inject(TOKENS.FundRepo) private readonly fundRepo: IFundRepository,
  ) {}

  async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<FundResponseDto>>> {
    try {
      const { data, total } = await this.fundRepo.findAll(params);
      const response = buildPaginatedResponse(toFundResponseList(data), total, params);
      return Result.ok(response);
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to fetch funds', err as Error));
    }
  }

  async findById(id: string): Promise<Result<FundResponseDto, DomainError>> {
    const fund = await this.fundRepo.findById(id);
    if (!fund) return Result.fail(new FundNotFoundError(id));
    return Result.ok(toFundResponse(fund));
  }

  async create(data: CreateFundDto): Promise<Result<FundResponseDto, DomainError>> {
    try {
      const fund = await this.fundRepo.create(data);
      return Result.ok(toFundResponse(fund));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return Result.fail(new ValidationError('Fund name already exists'));
      }
      return Result.fail(new InfrastructureError('Failed to create fund', err as Error));
    }
  }

  async update(data: UpdateFundDto): Promise<Result<FundResponseDto, DomainError>> {
    const { id, ...updateData } = data;
    const exists = await this.fundRepo.exists(id);
    if (!exists) return Result.fail(new FundNotFoundError(id));

    try {
      const fund = await this.fundRepo.update(id, updateData);
      return Result.ok(toFundResponse(fund));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to update fund', err as Error));
    }
  }
}
```

### Caching Decorator

```typescript
// services/decorators/caching-fund.service.ts
export class CachingFundService implements IFundService {
  constructor(
    private readonly inner: IFundService,
    private readonly cache: ICacheService,
  ) {}

  async findAll(params: PaginationParams) {
    const cacheKey = CacheKeys.FUNDS_LIST(params.page, params.limit);
    try {
      const cached = this.cache.get<PaginatedResponse<FundResponseDto>>(cacheKey);
      if (cached && cached.data && Array.isArray(cached.data)) {
        return Result.ok(cached);
      }
    } catch { /* fall through */ }

    const result = await this.inner.findAll(params);

    if (result.isOk) {
      this.cache.set(cacheKey, result.value);
    }
    return result;
  }

  async findById(id: string) {
    const cacheKey = CacheKeys.FUND_BY_ID(id);
    try {
      const cached = this.cache.get<FundResponseDto>(cacheKey);
      if (cached && cached.id) return Result.ok(cached);
    } catch { /* fall through */ }

    const result = await this.inner.findById(id);

    if (result.isOk) {
      this.cache.set(cacheKey, result.value, CACHE_TTL_SINGLE);
    }
    return result;
  }

  async create(data: CreateFundDto) {
    const result = await this.inner.create(data);
    if (result.isOk) {
      this.cache.set(CacheKeys.FUND_BY_ID(result.value.id), result.value, CACHE_TTL_SINGLE);
      this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
    }
    return result;
  }

  async update(data: UpdateFundDto) {
    const result = await this.inner.update(data);
    if (result.isOk) {
      this.cache.set(CacheKeys.FUND_BY_ID(data.id), result.value, CACHE_TTL_SINGLE);
      this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
    }
    return result;
  }
}
```

### Logging Decorator

```typescript
// services/decorators/logging-fund.service.ts
export class LoggingFundService implements IFundService {
  constructor(
    private readonly inner: IFundService,
    private readonly logger: ILogger,
  ) {}

  async findAll(params: PaginationParams) {
    const start = Date.now();
    const result = await this.inner.findAll(params);
    const duration = Date.now() - start;

    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.FUND_LIST_FETCHED, {
        page: params.page,
        count: result.value.data.length,
        duration: `${duration}ms`,
      });
    } else {
      this.logger.error(LOG_MESSAGES.FUND_LIST_FAILED, {
        params,
        error: result.error.message,
        duration: `${duration}ms`,
      });
    }

    if (duration > 200) {
      this.logger.warn(LOG_MESSAGES.SLOW_QUERY_DETECTED, {
        operation: 'fund.findAll',
        duration: `${duration}ms`,
      });
    }

    return result;
  }

  async findById(id: string) {
    const result = await this.inner.findById(id);
    if (result.isErr) {
      this.logger.debug(LOG_MESSAGES.FUND_NOT_FOUND, { id });
    }
    return result;
  }

  async create(data: CreateFundDto) {
    const result = await this.inner.create(data);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.FUND_CREATED, { id: result.value.id });
    } else {
      this.logger.error(LOG_MESSAGES.FUND_CREATE_FAILED, { error: result.error.message });
    }
    return result;
  }

  async update(data: UpdateFundDto) {
    const result = await this.inner.update(data);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.FUND_UPDATED, { id: data.id });
    } else {
      this.logger.error(LOG_MESSAGES.FUND_UPDATE_FAILED, { id: data.id, error: result.error.message });
    }
    return result;
  }
}
```

### Container Registration — Composing Decorators

```typescript
// container.ts
import { container } from 'tsyringe';

// Register core service
container.register(TOKENS.FundServiceCore, { useClass: FundService });

// Compose decorators: Controller → Caching → Logging → Core
container.register(TOKENS.FundService, {
  useFactory: (c) => {
    const core = c.resolve<IFundService>(TOKENS.FundServiceCore);
    const cache = c.resolve<ICacheService>(TOKENS.CacheService);
    const logger = c.resolve<ILogger>(TOKENS.Logger);

    // Wrap: outermost = caching, inner = logging, innermost = core
    const withLogging = new LoggingFundService(core, logger);
    const withCaching = new CachingFundService(withLogging, cache);
    return withCaching;
  },
});
```

### Updated Tokens

```typescript
// constants/tokens.ts
export const TOKENS = {
  // Infrastructure
  PrismaClient:   Symbol.for('PrismaClient'),
  CacheService:   Symbol.for('ICacheService'),
  Logger:         Symbol.for('ILogger'),

  // Repositories
  FundRepo:       Symbol.for('IFundRepository'),
  InvestorRepo:   Symbol.for('IInvestorRepository'),
  InvestmentRepo: Symbol.for('IInvestmentRepository'),

  // Services — core (unwrapped) and decorated (what controllers use)
  FundServiceCore:       Symbol.for('FundServiceCore'),
  FundService:           Symbol.for('IFundService'),
  InvestorServiceCore:   Symbol.for('InvestorServiceCore'),
  InvestorService:       Symbol.for('IInvestorService'),
  InvestmentServiceCore: Symbol.for('InvestmentServiceCore'),
  InvestmentService:     Symbol.for('IInvestmentService'),
} as const;
```

### Why This Is Better

1. **Core service is pure**: Only business logic, no caching/logging noise
2. **Each concern is testable independently**: Test caching decorator with mock inner service
3. **Easy to add/remove concerns**: Need rate limiting? Add a decorator. No caching? Remove registration
4. **Open/Closed principle**: Add behavior without modifying existing code
5. **This is how DI is MEANT to be used**: The whole point of DI is composability

### C# Comparison

This is exactly the **Decorator Pattern** you'd implement with Scrutor in C#:

```csharp
// C# with Scrutor
services.AddScoped<IFundService, FundService>();
services.Decorate<IFundService, LoggingFundService>();
services.Decorate<IFundService, CachingFundService>();
```

Our tsyringe `useFactory` achieves the same composition.

---

## 12. Revised FundService — Clean Version

Putting it all together — here's what the final fund service looks like after
all fixes. Compare this to the version in Plan 2:

```typescript
// services/fund.service.ts — FINAL VERSION
// Pure business logic only. Caching and logging are handled by decorators.
import { injectable, inject } from 'tsyringe';
import { Prisma } from '@prisma/client';
import { IFundService } from './interfaces/fund.service.interface';
import { IFundRepository } from '../repositories/interfaces/fund.repository.interface';
import { CreateFundDto, UpdateFundDto } from '../schemas/fund.schema';
import { PaginationParams } from '../schemas/pagination.schema';
import { buildPaginatedResponse, PaginatedResponse } from '../lib/pagination';
import { toFundResponse, toFundResponseList, FundResponseDto } from '../dtos/fund.dto';
import { Result } from '../lib/result';
import { DomainError, FundNotFoundError, ValidationError, InfrastructureError } from '../errors/domain-errors';
import { TOKENS } from '../constants/tokens';

@injectable()
export class FundService implements IFundService {
  constructor(
    @inject(TOKENS.FundRepo) private readonly fundRepo: IFundRepository,
  ) {}

  async findAll(
    params: PaginationParams
  ): Promise<Result<PaginatedResponse<FundResponseDto>, DomainError>> {
    try {
      const { data, total } = await this.fundRepo.findAll(params);
      return Result.ok(buildPaginatedResponse(toFundResponseList(data), total, params));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to fetch funds', err as Error));
    }
  }

  async findById(id: string): Promise<Result<FundResponseDto, DomainError>> {
    const fund = await this.fundRepo.findById(id);
    if (!fund) return Result.fail(new FundNotFoundError(id));
    return Result.ok(toFundResponse(fund));
  }

  async create(data: CreateFundDto): Promise<Result<FundResponseDto, DomainError>> {
    try {
      const fund = await this.fundRepo.create(data);
      return Result.ok(toFundResponse(fund));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return Result.fail(new ValidationError('A fund with this name already exists'));
      }
      return Result.fail(new InfrastructureError('Failed to create fund', err as Error));
    }
  }

  async update(data: UpdateFundDto): Promise<Result<FundResponseDto, DomainError>> {
    const { id, ...updateData } = data;

    const exists = await this.fundRepo.exists(id);
    if (!exists) return Result.fail(new FundNotFoundError(id));

    try {
      const fund = await this.fundRepo.update(id, updateData);
      return Result.ok(toFundResponse(fund));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to update fund', err as Error));
    }
  }
}
```

Look how clean that is. No caching code. No logging calls. No cache
key management. Just: validate → call repo → map to DTO → return Result.

The caching and logging decorators handle everything else, and they're
composed in `container.ts`.

---

## Final Updated Project Structure

```
src/
├── index.ts                    # import 'reflect-metadata' first
├── app.ts
├── container.ts                # DI registration + decorator composition
│
├── constants/
│   ├── index.ts
│   ├── tokens.ts               # ★ All DI tokens in one place
│   ├── http.ts
│   ├── errors.ts
│   ├── validation.ts
│   ├── cache.ts                # ★ CacheKeys with extracted prefixes
│   ├── log-messages.ts
│   └── enums.ts
│
├── errors/                     # ★ Domain error hierarchy
│   └── domain-errors.ts
│
├── lib/
│   ├── prisma.ts
│   ├── cache.ts                # ICacheService + NodeCacheService
│   ├── logger.ts               # ILogger + PinoLogger
│   ├── pagination.ts
│   ├── result.ts               # ★ Result<T, E> pattern
│   └── single-flight.ts        # ★ Cache stampede protection
│
├── dtos/
│   ├── fund.dto.ts
│   ├── investor.dto.ts
│   └── investment.dto.ts
│
├── repositories/
│   ├── interfaces/
│   │   ├── fund.repository.interface.ts
│   │   ├── investor.repository.interface.ts
│   │   └── investment.repository.interface.ts
│   └── prisma/
│       ├── fund.repository.ts
│       ├── investor.repository.ts
│       └── investment.repository.ts
│
├── services/
│   ├── interfaces/
│   │   ├── fund.service.interface.ts
│   │   ├── investor.service.interface.ts
│   │   └── investment.service.interface.ts
│   ├── decorators/             # ★ Cross-cutting concern wrappers
│   │   ├── caching-fund.service.ts
│   │   ├── logging-fund.service.ts
│   │   ├── caching-investor.service.ts
│   │   ├── logging-investor.service.ts
│   │   ├── caching-investment.service.ts
│   │   └── logging-investment.service.ts
│   ├── fund.service.ts         # Pure business logic
│   ├── investor.service.ts
│   └── investment.service.ts
│
├── controllers/
│   ├── fund.controller.ts
│   ├── investor.controller.ts
│   └── investment.controller.ts
│
├── schemas/
│   ├── fund.schema.ts
│   ├── investor.schema.ts
│   ├── investment.schema.ts
│   └── pagination.schema.ts
│
├── middleware/
│   ├── errorHandler.ts         # Maps DomainErrors → HTTP responses
│   ├── requestLogger.ts
│   ├── correlationId.ts        # ★ Adds x-correlation-id header
│   ├── validate.ts
│   └── notFound.ts
│
├── routes/
│   ├── index.ts
│   ├── fund.routes.ts
│   ├── investor.routes.ts
│   └── investment.routes.ts
│
└── types/
    └── index.ts

tests/
├── unit/
│   ├── services/
│   │   ├── fund.service.test.ts     # Mock repo, test pure logic
│   │   └── investor.service.test.ts
│   └── decorators/
│       ├── caching-fund.test.ts     # Mock inner service, test cache behavior
│       └── logging-fund.test.ts
└── integration/
    ├── setup.ts
    ├── funds.test.ts                # Real DB via Supertest
    ├── investors.test.ts
    └── investments.test.ts
```

---

## Summary of All Fixes

| # | Issue | Fix | Severity |
|---|-------|-----|----------|
| 1 | Symbol token string drift | Centralized TOKENS object with Symbol.for() | Low |
| 2 | No I-prefix convention | I-prefix for injectable interfaces, none for DTOs | Style |
| 3 | Cache returns unvalidated data | Runtime type check + try/catch on cache reads | Medium |
| 4 | update passes id in data to repo | Destructure properly, use Omit<> in repo type | **Bug** |
| 5 | Raw DB errors bubble up | Result pattern + domain error hierarchy | High |
| 6 | findById returns null silently | Result pattern, explicit contract | Medium |
| 7 | Cache prefix is hardcoded string | Extract PREFIX constants, keys reference them | Medium |
| 8 | No failure/perf logging | Log on error, cache hit/miss, slow queries, correlation IDs | High |
| 9 | Cache miss after create | Warm by-ID cache proactively after create/update | Low |
| 10 | Cache stampede on concurrent requests | Single-flight pattern | Low |
| 11 | Service mixes business + cross-cutting | Decorator pattern via DI composition | Architectural |