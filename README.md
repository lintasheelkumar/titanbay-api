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
Routes → Controllers → Services → Repositories → Prisma. Logging and caching are applied as decorators that wrap the core service — the controller only knows the `IFundService` interface and has no awareness of either concern. This keeps business logic clean and makes each layer independently testable.

**Repository pattern.**
All database access sits behind interfaces (`IFundRepository` etc.) with Prisma implementations injected via the DI container. Services depend on the interface, not Prisma directly, so the persistence layer is swappable and unit tests can use plain mocks.

**Dependency injection (tsyringe).**
Every dependency is registered in a single `ContainerLoader` and resolved by token. This makes the composition explicit and centralised — changing how a service is built (e.g. adding a new decorator) requires editing one file.

**Result monad for error handling.**
Service methods return `Result<T, DomainError>` instead of throwing. Errors are values that propagate through every layer without try/catch noise, and controllers map them to HTTP status codes deterministically.

**Zod validation.**
Request bodies and params are validated by Zod schemas before reaching controllers. Types are inferred from the same schema, so there is no duplication between the validation rule and the TypeScript type.

**In-process caching (node-cache).**
Paginated list results are cached for 5 minutes; individual entities for 2 minutes. Cache entries are invalidated by key-prefix on any mutation. Cache writes are best-effort — a miss falls through to the database transparently.

**DTO mapping at the service boundary.**
Prisma entities are never returned directly to callers. Each domain has a dedicated mapper (`toFundResponse` etc.) that converts DB types to serialisation-safe shapes — `Decimal` → `number`, `Date` → ISO string, enum → display string. This keeps the public API contract decoupled from the database schema.

**Structured logging (Pino).**
Logging is handled by a `LoggingXxxService` decorator, not HTTP middleware, so every log entry carries business context (fund id, result count, duration) rather than just request metadata. Slow queries (> 200 ms) emit an additional warning. Log level and pretty-printing are controlled via `LOG_LEVEL` and `LOG_PRETTY` env vars.

**Decimal for monetary values.**
PostgreSQL `NUMERIC(18,2)` via Prisma `Decimal` avoids floating-point precision errors on large fund amounts. Serialised to `number` in JSON responses.

**UUID primary keys.**
Prevents enumeration attacks, matches the spec, and is natively supported by Postgres.

**Consistent error format.**
Every error (validation, not found, conflict, internal) returns the same JSON envelope with a machine-readable `code`, making client error handling straightforward.

**`bypass_validation` not honoured (by design).**
The transaction spec includes a `bypass_validation` flag. This field is intentionally ignored — skipping server-side validation based on a client-supplied flag is a security anti-pattern. This is a deliberate decision, not an oversight.


## Scaling Considerations

- Stateless design — horizontally scalable behind a load balancer
- Container-ready for Cloud Run / GKE deployment
- Prisma connection pooling handles concurrent requests
- Would add: rate limiting, API key authentication, structured request

