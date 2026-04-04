# Titanbay Private Markets API

RESTful API for managing private market funds, investors, and investments.

## Quick Start

```bash
git clone <repo-url>
cd titanbay-api
cp .env.example .env
docker-compose up --build
```

The API will be available at `http://localhost:3000`.
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
| PUT    | `/funds` | Update a fund (id in body — per spec) |
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

- **Layered architecture**: Routes → Controllers → Services → Prisma.
  Controllers handle only HTTP concerns (parse request, send response).
  Services own business logic and are independently testable.

- **Decimal for monetary values**: PostgreSQL `NUMERIC(18,2)` via Prisma
  `Decimal` to avoid floating-point precision errors on large fund amounts.
  Serialised to `number` in JSON responses (matching the spec format).

- **UUID primary keys**: Prevents enumeration attacks, matches the spec,
  and is natively supported by Postgres.

- **Zod validation**: Input validated and TypeScript types inferred from
  the same schema — single source of truth. Applied as Express middleware
  before handlers run.

- **Consistent error format**: Every error (validation, not found, conflict,
  internal) returns the same JSON envelope with a machine-readable `code`.

- **PUT with id in body**: The spec defines `PUT /funds` with the fund id
  inside the request body rather than the URL path. This is unconventional
  (REST convention puts the id in the path: `PUT /funds/:id`) but the spec
  was followed as-is. This design choice is noted here for discussion.

- **`bypass_validation` not honoured (by design)**: The transaction spec
  includes a `bypass_validation` flag. This field is intentionally ignored —
  skipping server-side validation based on a client-supplied flag is a
  security anti-pattern that allows clients to submit arbitrary unvalidated
  data. This is a deliberate decision, not an oversight.

## Scaling Considerations

- Stateless design — horizontally scalable behind a load balancer
- Container-ready for Cloud Run / GKE deployment
- Prisma connection pooling handles concurrent requests
- Would add: rate limiting, API key authentication, structured request
  logging (pino), response caching for read-heavy endpoints

## AI Tool Usage

I used Claude (via Claude Code in VS Code) throughout development:
- Architecture planning and technology choices
- Scaffolding project structure and boilerplate
- Writing Prisma schema and Zod validation schemas
- Generating test cases and edge case identification
- README and documentation drafting

All code was reviewed and understood before committing. AI was used as a
force multiplier for speed, while architectural decisions and code review
remained my responsibility.
