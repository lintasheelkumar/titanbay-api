# Titanbay Private Markets API

RESTful API for managing private market funds, investors, and investments.

## Quick Start

```bash
git clone <repo-url>
cd titanbay-api
docker-compose up --build
```

The API Docs will be available at `http://localhost:3000/api-docs`.
Postgres runs on port 5432.

## Alternative Setup (without Docker)

```bash
npm install
# Ensure PostgreSQL is running and update .env with your connection string
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/health` | Health check |
| GET    | `/funds` | List all funds |
| POST   | `/funds` | Create a fund |
| PUT    | `/funds/:id` | Update a fund |
| GET    | `/funds/:id` | Get a fund by id |
| GET    | `/investors` | List all investors |
| POST   | `/investors` | Create an investor |
| GET    | `/funds/:fund_id/investments` | List investments for a fund |
| POST   | `/funds/:fund_id/investments` | Create an investment |

### Example: Create a Fund

**Request**
```bash
curl -X POST http://localhost:3000/funds \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alpha Fund III",
    "vintage_year": 2025,
    "target_size_usd": 50000000,
    "status": "Fundraising"
  }'
```

`status` is optional and defaults to `Fundraising`. Valid values: `Fundraising`, `Investing`, `Closed`.

**Response** `201 Created`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Alpha Fund III",
  "vintage_year": 2025,
  "target_size_usd": 50000000,
  "status": "Fundraising",
  "created_at": "2025-04-05T10:00:00.000Z"
}
```

**Duplicate name + year** `400 Bad Request`
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A fund with this name and vintage year already exists"
  }
}
```

### Error Response Format

All errors return a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "vintage_year", "message": "Must be a positive integer" }
    ]
  }
}
```

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`

## API Documentation

Interactive Swagger UI is available at:

  http://localhost:3000/api-docs

The raw OpenAPI 3.0 spec is available at:

  http://localhost:3000/api-docs.json

All endpoints can be tested directly from the Swagger UI — click "Try it out" on any endpoint, modify the example values, and hit "Execute" to send a real request.

### How the docs are generated

The OpenAPI spec is built automatically at startup using `swagger-jsdoc`. There are two parts:

- **Endpoint definitions** — generated from `@openapi` JSDoc comments co-located with each route handler (e.g. `src/api/routes/fund.routes.ts`). Adding a new route and its JSDoc block is all that's needed for it to appear in the docs.
- **Shared schemas and parameters** — defined manually in `src/config/swagger.ts` (e.g. `Fund`, `Investor`, `ErrorResponse`, `PageParam`). These need to be updated when data models change.

At build time, TypeScript compiles routes to `./dist/api/routes/*.js`. At startup, `swagger-jsdoc` scans those files, extracts all `@openapi` blocks, and merges them with the shared components to produce the final spec.

## Running Tests

```bash
npm test
```

Tests use the `TEST_DATABASE_URL` from `.env` (falls back to `DATABASE_URL`).
Each test suite resets the relevant tables before running.

## Architecture & Design Decisions

> Visual diagrams in [mermaid/](mermaid/).
>
> | Diagram | What it shows |
> |---------|---------------|
> | [01-request-flow.mmd](mermaid/01-request-flow.mmd) | Sequence diagram — full GET /funds journey including cache hit/miss |
> | [02-layer-architecture.mmd](mermaid/02-layer-architecture.mmd) | All layers from HTTP client to DB |
> | [03-decorator-pattern.mmd](mermaid/03-decorator-pattern.mmd) | How Caching/Logging/Core wrap each other |
> | [04-di-container.mmd](mermaid/04-di-container.mmd) | DI container wiring from infra through to controllers |
> | [05-error-hierarchy.mmd](mermaid/05-error-hierarchy.mmd) | DomainError inheritance tree |
> | [06-repository-pattern.mmd](mermaid/06-repository-pattern.mmd) | Repository interfaces vs Prisma implementations |
> | [07-cache-invalidation.mmd](mermaid/07-cache-invalidation.mmd) | Cache read/write and invalidation strategy |
> | [08-data-flow-dto.mmd](mermaid/08-data-flow-dto.mmd) | Entity → DTO type conversions |

---

**Layered architecture with Decorator pattern for cross-cutting concerns.**

Every HTTP request passes through a fixed sequence of layers:

```
HTTP Client
    → Express Router       (matches path/method, runs validation middleware)
    → Controller           (parses request, calls service, maps Result → HTTP response)
    → CachingXxxService    (decorator: checks/writes cache, delegates on miss)
    → LoggingXxxService    (decorator: times the call, logs outcome + slow-query warnings)
    → Core XxxService      (pure business logic — domain rules, repository calls)
    → Repository           (interface — abstracts all database access)
    → Prisma               (ORM — SQL generation, connection pooling)
```

Controllers depend only on the `IFundService` interface. They have no idea whether caching or logging exist — those concerns are invisible to them. The decorators are stacked in `ContainerLoader.ts` — the single file you edit to add, remove, or reorder a concern. Each layer can be tested in isolation by replacing its inner dependency with a plain mock.

**Repository pattern.**

All database access is hidden behind interfaces (`IFundRepository`, `IInvestorRepository`, `IInvestmentRepository`). The interface declares what operations are available (e.g. `findById`, `create`); the Prisma implementation in `src/database/repositories/` provides the actual SQL. Services import and depend on the interface only — they never reference Prisma directly.

This has two practical benefits:
- **Testability** — unit tests pass a plain in-memory mock that satisfies the interface; no real database connection is needed.
- **Swappability** — replacing Prisma with a different ORM means rewriting the repository class only. No service code changes.

**Dependency injection (tsyringe).**

All wiring is centralised in `src/loaders/ContainerLoader.ts`. Every class registers its dependencies against named string tokens (defined in `src/constants/tokens.ts`), and tsyringe resolves and injects them automatically at startup. The decorator stack for each service is assembled once using a factory:

```ts
// ContainerLoader.ts — the only place the decorator order is decided
container.register<IFundService>(TOKENS.FundService, {
  useFactory: (c) => {
    const core   = c.resolve(TOKENS.FundServiceCore);  // pure business logic
    const cache  = c.resolve(TOKENS.CacheService);
    const logger = c.resolve(TOKENS.Logger);
    // Controller receives Caching → Logging → Core (outermost first)
    return new CachingFundService(new LoggingFundService(core, logger), cache, logger);
  },
});
```

Adding a new cross-cutting concern (e.g. metrics) means creating one new decorator class and updating this factory — nothing else changes.

**Result monad for error handling.**

Service methods never throw for expected failures. Instead they return a `Result<T, DomainError>` — a wrapper that holds *either* a success value *or* a typed domain error. The class (in `src/lib/result.ts`) enforces that you check which one you have before accessing either:

```ts
// Service — returns a Result, never throws for domain failures
async findById(id: string): Promise<Result<FundResponseDto, DomainError>> {
  const fund = await this.fundRepo.findById(id);
  if (!fund) return Result.fail(new FundNotFoundError(id));  // error is a value
  return Result.ok(toFundResponse(fund));
}

// Controller — reads statusCode directly from the error object; no switch needed
const result = await this.service.findById(id);
if (result.isErr) {
  return res
    .status(result.error.statusCode)
    .json({ error: { code: result.error.code, message: result.error.message } });
}
return res.json(result.value);
```

Each `DomainError` subclass (`NotFoundError` → 404, `ValidationError` → 400, `DuplicateEmailError` → 409, `InfrastructureError` → 500) carries its own `statusCode` and `code` string. The controller maps errors to HTTP responses deterministically without any conditional logic.

**Zod validation.**

Every incoming request is validated against a Zod schema *before* it reaches the controller. Middleware helpers (`validateBody`, `validateParams`, `validateQuery` in `src/api/middlewares/validate.ts`) call `schema.safeParse()` and forward a `ValidationError` to Express's error handler on failure — so an invalid request is rejected at the boundary and never proceeds further into the application.

The same schema object is the single source of truth for the TypeScript type:

```ts
// src/api/schemas/fund.schema.ts
export const createFundSchema = z.object({
  name:             z.string().min(1).max(255),
  vintage_year:     z.number().int().min(1900).max(currentYear + 5),
  target_size_usd:  z.number().positive(),
  status:           z.enum(['Fundraising', 'Investing', 'Closed']).optional(),
});

export type CreateFundInput = z.infer<typeof createFundSchema>;
// ↑ TypeScript type is derived from the schema — no separate interface to maintain
```

Tightening a validation rule in the schema automatically tightens the TypeScript type with it.

**In-process caching (node-cache).**

Paginated list results are cached for 5 minutes; single-entity lookups for 2 minutes. Caching is implemented entirely in the `CachingXxxService` decorator — it checks the cache first and returns immediately on a hit, without calling the inner service or touching the database. On a miss, it delegates to the inner service and writes the result to cache on success.

Cache keys are namespaced by operation and parameters (e.g. `funds:list:page=1:limit=20`, `funds:id:abc-123`). On any write mutation (create or update), the decorator invalidates all keys sharing the list prefix so stale paginated pages are never served. Cache writes are best-effort — if the cache itself throws, the error is logged at `warn` level and the call falls through to the database transparently.

**DTO mapping at the service boundary.**

Prisma entity types (e.g. `Fund` from `@prisma/client`) contain database-native types that are unsafe to serialise directly: `Decimal` (Prisma's arbitrary-precision type for `NUMERIC` columns) does not serialise to a plain JSON number, and `Date` can serialise inconsistently. Each domain has a dedicated mapper that converts these types at the boundary:

```ts
// src/api/dtos/fund.dto.ts
export function toFundResponse(fund: Fund): FundResponseDto {
  return {
    id:              fund.id,
    name:            fund.name,
    vintage_year:    fund.vintage_year,
    target_size_usd: fund.target_size_usd.toNumber(),  // Decimal → plain number
    status:          fund.status,
    created_at:      fund.created_at.toISOString(),    // Date → ISO 8601 string
  };
}
```

Services always return `FundResponseDto`, never a raw Prisma `Fund`. This means the JSON contract is stable regardless of schema changes in the database, and internal or sensitive columns can never accidentally leak into responses.

**Structured logging (Pino).**

Logging lives in a `LoggingXxxService` decorator, not in HTTP middleware. This means every log entry carries the *business context* of the operation — fund ID, result count, duration — rather than just the raw HTTP method and URL. For example, a `findAll` call logs `{ page, count, total, duration }`, making it immediately actionable in production.

Calls that exceed 200 ms emit an additional `warn`-level slow-query entry, separate from the normal info log. Log level (`trace` / `debug` / `info` / `warn` / `error`) and output format are controlled by `LOG_LEVEL` and `LOG_PRETTY` environment variables — local development gets readable pretty-printed output; production emits structured JSON that log aggregators can parse.

**Decimal for monetary values.**

JavaScript `number` is a 64-bit floating-point value. Representing large fund amounts such as $500,000,000.00 as floats introduces rounding errors. The database column is `NUMERIC(18,2)` — exact fixed-point arithmetic in Postgres. Prisma surfaces this as a `Decimal` type (arbitrary precision), which is only converted to a JavaScript `number` at the DTO mapping step, where a small rounding error in the final two decimal places is acceptable for JSON serialisation.

**Currency handling (known limitation).**

All monetary fields currently encode the currency in the field name (`target_size_usd`, `amount_usd`). This works for a USD-only system but does not scale to multi-currency: adding EUR support would require new fields or a breaking API change. The idiomatic approach is a structured money object:

```json
{
  "amount": {
    "value": "75000000.00",
    "currency": "USD",
    "precision": "exact"
  }
}
```

This keeps the field name stable regardless of currency, makes the currency explicit to API consumers, and allows the `precision` hint to communicate whether the value is exact (from `NUMERIC`) or rounded. This change was not made — the current spec uses flat `_usd` fields — but it is the recommended shape for any multi-currency extension.

**UUID primary keys.**

Sequential integer IDs expose the total record count and make it trivial to scrape resources by incrementing the ID parameter. UUIDs are random 128-bit values with no sequential relationship, making enumeration attacks infeasible. Postgres supports `uuid` as a native column type and Prisma generates values automatically via `@default(uuid())` — no application-level ID generation is required.

**Consistent error format.**

Every error response, regardless of where it originates, uses the same JSON envelope:

```json
{ "error": { "code": "NOT_FOUND", "message": "Fund with id '...' was not found" } }
```

This is enforced by the global error handler in `src/api/middlewares/errorHandler.ts`, which receives every error passed to `next(err)` and formats it using the `code` and `statusCode` already attached to each `DomainError` subclass. Database unique-constraint violations (Prisma error code `P2002`) are caught at the service layer and converted to a `ValidationError` before surfacing — raw database error messages never reach the client.

**`bypass_validation` not honoured (by design).**
The transaction spec includes a `bypass_validation` flag. This field is intentionally ignored — skipping server-side validation based on a client-supplied flag is a security anti-pattern. This is a deliberate decision, not an oversight.


## Scaling Considerations

**What works today**

- **Container-ready.** The app is fully Dockerised with a health check endpoint (`/health`) and `restart: unless-stopped`. It exposes a single port and has no startup state that would prevent running behind a load balancer or deploying to Cloud Run / GKE.
  - **Prisma connection pooling.** A single `PrismaClient` instance is created at startup and registered as a singleton in the DI container, so all requests share one connection pool. The default pool size is `(number of CPU cores × 2) + 1`. This is adequate for moderate load but should be tuned explicitly via the `connection_limit` query parameter in `DATABASE_URL` for production.
- **Structured business-context logging.** Pino emits JSON by default, which log aggregators (Datadog, GCP Logging, etc.) can ingest and index without additional parsing.

**Known limitations to address before horizontal scaling**

- **In-process cache is not shared between replicas.** `node-cache` stores data in the Node.js process heap. If you run two instances, a write on instance A invalidates A's cache but B and C still serve stale data until the TTL expires (up to 5 minutes for lists). Before scaling horizontally, replace `NodeCacheService` with a shared external cache (e.g. Redis) that all instances read from and write to.
- **No cache stampede protection.** When a hot cache entry expires, many concurrent requests will all miss simultaneously and hit the database in parallel. A Redis-based solution can use locking or probabilistic early expiry to avoid this.
- **Shallow health check.** `GET /health` returns `{ status: "ok" }` based solely on the process being alive — it does not verify that the database is reachable. A load balancer routing traffic to an instance with a broken DB connection would see it as healthy. A deep check should attempt a lightweight Prisma query (e.g. `$queryRaw\`SELECT 1\``) and return 503 on failure.
- **Single database instance.** The current setup has one Postgres node — a single point of failure and a write bottleneck. Production deployments should use a primary + read replica(s), with read-only queries (list, getById) routed to replicas.

**Would also add before production**

- Rate limiting per IP / API key (e.g. `express-rate-limit`) to prevent abuse
- API key or JWT authentication on all non-health endpoints
- A request correlation ID (injected as `X-Request-Id` and attached to every log entry) to trace a single request across multiple log lines

