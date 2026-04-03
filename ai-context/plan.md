# Titanbay Private Markets API — Build Plan

## Context

**Role**: Senior Software Engineer (full-stack, TypeScript)
**Task**: Build a RESTful API for managing private market funds, investors, and investments
**API spec**: https://storage.googleapis.com/interview-api-doc-funds.wearebusy.engineering/index.html
**Key signal from job spec**: They use TypeScript + Vue, value scalable architecture, Docker/containerisation, GCP, clean code, mentorship-quality readability

---

## Stack Decisions

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict mode) | Matches their stack. C# background makes TS natural |
| Framework | Express.js | Industry standard, minimal magic, easy to review |
| ORM | Prisma | Type-safe client generated from schema, clean migrations, best DX for Postgres in TS |
| Database | PostgreSQL 16 | Required by spec. Use NUMERIC for money, UUIDs for PKs |
| Validation | Zod | Infers TS types from schemas — validate + type in one place |
| Testing | Jest + Supertest | Integration tests against real DB (test container) |
| Containerisation | Docker + Docker Compose | One-command setup. Multi-stage Dockerfile for production image |
| Dev tooling | tsx (dev runner), ESLint, Prettier | Fast iteration, consistent code style |

---

## Architecture

```
HTTP Request
    │
    ▼
┌─────────────────────────────────┐
│  Express Router + Middleware    │  ← Route matching, Zod validation, error handling
└─────────────┬───────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐┌────────┐┌────────────┐
│ Fund   ││Investor││ Investment │  ← Controllers: HTTP concerns only (parse req, send res)
│ Ctrl   ││ Ctrl   ││ Ctrl       │
└───┬────┘└───┬────┘└─────┬──────┘
    │         │           │
    ▼         ▼           ▼
┌────────┐┌────────┐┌────────────┐
│ Fund   ││Investor││ Investment │  ← Services: business logic, validation rules
│ Service││Service ││ Service    │
└───┬────┘└───┬────┘└─────┬──────┘
    │         │           │
    └─────────┼───────────┘
              ▼
┌─────────────────────────────────┐
│  Prisma Client (singleton)     │  ← Type-safe DB access, connection pooling
└─────────────┬───────────────────┘
              ▼
┌─────────────────────────────────┐
│  PostgreSQL                    │  ← funds, investors, investments tables
└─────────────────────────────────┘
```

**Why this layered approach (C# comparison)**:
- Controllers = ASP.NET Controller actions (thin, HTTP only)
- Services = your service/repository layer (testable business logic)
- Prisma = Entity Framework DbContext (typed queries, migrations)
- Zod schemas = FluentValidation validators (but also generate TS types)
- Express middleware = ASP.NET middleware pipeline (error handling, logging)

---

## Project Structure

```
titanbay-api/
├── docker-compose.yml          # App + Postgres containers
├── Dockerfile                  # Multi-stage: build → production
├── package.json
├── tsconfig.json
├── .env.example                # Template for env vars
├── .eslintrc.json
├── .prettierrc
├── Makefile                    # dev, test, seed, build shortcuts
├── README.md                   # Setup, decisions, AI usage
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Versioned SQL migrations
│   └── seed.ts                 # Sample data for demo/review
│
├── src/
│   ├── index.ts                # Entry point: create app, start server
│   ├── app.ts                  # Express app setup (separate for testing)
│   │
│   ├── routes/
│   │   ├── index.ts            # Aggregates all route files
│   │   ├── fund.routes.ts
│   │   ├── investor.routes.ts
│   │   └── investment.routes.ts
│   │
│   ├── controllers/
│   │   ├── fund.controller.ts
│   │   ├── investor.controller.ts
│   │   └── investment.controller.ts
│   │
│   ├── services/
│   │   ├── fund.service.ts
│   │   ├── investor.service.ts
│   │   └── investment.service.ts
│   │
│   ├── schemas/                # Zod validation schemas
│   │   ├── fund.schema.ts
│   │   ├── investor.schema.ts
│   │   └── investment.schema.ts
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts     # Global error handler
│   │   ├── validate.ts         # Generic Zod validation middleware
│   │   └── notFound.ts         # 404 handler
│   │
│   ├── lib/
│   │   └── prisma.ts           # Prisma client singleton
│   │
│   └── types/
│       └── index.ts            # Shared types (error types, etc.)
│
└── tests/
    ├── setup.ts                # Test DB setup/teardown
    ├── funds.test.ts
    ├── investors.test.ts
    └── investments.test.ts
```

---

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Fund {
  id              String       @id @default(uuid()) @db.Uuid
  name            String
  vintage_year    Int
  target_size_usd Decimal      @db.Decimal(18, 2)
  status          FundStatus   @default(Fundraising)
  created_at      DateTime     @default(now())
  investments     Investment[]

  @@map("funds")
}

model Investor {
  id            String       @id @default(uuid()) @db.Uuid
  name          String
  investor_type InvestorType
  email         String       @unique
  created_at    DateTime     @default(now())
  investments   Investment[]

  @@map("investors")
}

model Investment {
  id              String   @id @default(uuid()) @db.Uuid
  investor_id     String   @db.Uuid
  fund_id         String   @db.Uuid
  amount_usd      Decimal  @db.Decimal(18, 2)
  investment_date DateTime @db.Date

  investor Investor @relation(fields: [investor_id], references: [id])
  fund     Fund     @relation(fields: [fund_id], references: [id])

  @@map("investments")
}

enum FundStatus {
  Fundraising
  Investing
  Closed
}

enum InvestorType {
  Individual
  Institution
  Family_Office @map("Family Office")
}
```

**Design notes**:
- `Decimal(18,2)` for money — never use float for financial data
- UUIDs as primary keys (matches spec, prevents enumeration)
- `@unique` on investor email — prevents duplicates, business rule
- Enums enforce valid status/type values at DB level
- `@@map` gives clean table names (snake_case in DB, PascalCase in Prisma)
- Foreign keys with `@relation` enforce referential integrity

---

## API Endpoints — All 8 Core

### Funds (4 endpoints)

| Method | Path | Status Codes | Notes |
|--------|------|-------------|-------|
| GET | `/funds` | 200 | Returns array (empty array if none) |
| POST | `/funds` | 201, 400 | Validate name, vintage_year, target_size_usd, status |
| PUT | `/funds` | 200, 400, 404 | ID in body (per spec). Full replacement |
| GET | `/funds/:id` | 200, 404 | Validate UUID format |

### Investors (2 endpoints)

| Method | Path | Status Codes | Notes |
|--------|------|-------------|-------|
| GET | `/investors` | 200 | Returns array |
| POST | `/investors` | 201, 400, 409 | 409 if email already exists |

### Investments (2 endpoints)

| Method | Path | Status Codes | Notes |
|--------|------|-------------|-------|
| GET | `/funds/:fund_id/investments` | 200, 404 | 404 if fund doesn't exist |
| POST | `/funds/:fund_id/investments` | 201, 400, 404 | Validate fund exists, investor exists |

---

## Validation Rules (Zod Schemas)

### Fund
- `name`: string, min 1 char, max 255
- `vintage_year`: integer, min 1900, max current year + 5
- `target_size_usd`: positive number
- `status`: enum — "Fundraising" | "Investing" | "Closed"

### Investor
- `name`: string, min 1 char, max 255
- `investor_type`: enum — "Individual" | "Institution" | "Family Office"
- `email`: valid email format

### Investment
- `investor_id`: valid UUID
- `amount_usd`: positive number
- `investment_date`: valid date string (YYYY-MM-DD)

---

## Error Response Format (Consistent Across All Endpoints)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable description",
    "details": [
      {
        "field": "vintage_year",
        "message": "Must be a positive integer"
      }
    ]
  }
}
```

Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`

---

## Phase-by-Phase Build Order

### Phase 1: Scaffold (45 min)
1. `npm init` + install dependencies
2. Configure `tsconfig.json` (strict mode)
3. Set up ESLint + Prettier
4. Write `docker-compose.yml` (app + postgres)
5. Write `Dockerfile` (multi-stage)
6. Write Prisma schema
7. Run `prisma migrate dev` to create tables
8. Write seed script with sample data
9. Create `app.ts` with basic Express setup + health check `GET /health`
10. Verify: `docker-compose up` → hit `/health` → 200 OK

**Dependencies to install**:
```bash
# Production
npm i express @prisma/client zod dotenv

# Dev
npm i -D typescript @types/express @types/node tsx prisma
npm i -D jest @types/jest ts-jest supertest @types/supertest
npm i -D eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### Phase 2: Core Endpoints (2.5 hours)
Build each resource completely before moving on:

**Funds first** (most endpoints, establishes the pattern):
1. `fund.schema.ts` — Zod schemas for create + update
2. `fund.service.ts` — findAll, findById, create, update
3. `fund.controller.ts` — handlers for each endpoint
4. `fund.routes.ts` — wire routes to controllers
5. Register in `routes/index.ts`
6. Test manually with curl/Postman

**Then Investors** (follows same pattern):
1. `investor.schema.ts`
2. `investor.service.ts`
3. `investor.controller.ts`
4. `investor.routes.ts`
5. Handle 409 Conflict on duplicate email

**Then Investments** (introduces relationships):
1. `investment.schema.ts`
2. `investment.service.ts` — must validate fund_id and investor_id exist
3. `investment.controller.ts`
4. `investment.routes.ts` — nested under `/funds/:fund_id/investments`

### Phase 3: Error Handling + Edge Cases (1 hour)
1. Global error handler middleware (catches thrown errors, Prisma errors)
2. 404 handler for unknown routes
3. Handle Prisma-specific errors (P2002 = unique violation, P2025 = not found)
4. UUID format validation on path params (400 not 500)
5. Handle malformed JSON body (400 with clear message)
6. Test edge cases: empty body, wrong types, non-existent IDs, duplicate emails

### Phase 4: Integration Tests (1.5 hours)
Use a separate test database (docker-compose can spin one up).

```typescript
// Pattern for each test file:
beforeAll(async () => {
  // Reset DB, run migrations, seed if needed
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /funds', () => {
  it('creates a fund with valid data', async () => {
    const res = await request(app)
      .post('/funds')
      .send({ name: 'Test Fund', vintage_year: 2024, target_size_usd: 100000000, status: 'Fundraising' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Test Fund');
  });

  it('returns 400 for missing required fields', async () => { ... });
  it('returns 400 for invalid status enum', async () => { ... });
});
```

**Test coverage targets**:
- Happy path for all 8 endpoints
- Validation errors (missing fields, wrong types, invalid enums)
- 404 for non-existent resources
- 409 for duplicate investor email
- UUID format validation
- Relationship integrity (investment with non-existent fund/investor)

### Phase 5: Transaction Endpoints — Stretch (1.25 hours)
Only if core is solid. These 5 bonus endpoints:
- `GET /transactions`
- `POST /transactions/process` (auto fee calculation)
- `PUT /transactions/:id/reverse`
- `GET /funds/:fund_id/total-value`
- `POST /admin/recalculate-fees`

**Important**: The spec has a `bypass_validation` field. Implement the field in the schema but ALWAYS validate regardless. Document in README why — this is a security decision, not an oversight.

### Phase 6: README + Polish (1 hour)
1. Write comprehensive README (template below)
2. Review all error messages for clarity
3. Ensure `docker-compose up` works from clean clone
4. Add `.env.example`
5. Final lint + format pass

---

## README Template

```markdown
# Titanbay Private Markets API

RESTful API for managing private market funds, investors, and investments.

## Quick Start

\`\`\`bash
git clone <repo-url>
cd titanbay-api
cp .env.example .env
docker-compose up
\`\`\`

The API will be available at `http://localhost:3000`.
Postgres runs on port 5432.

## Alternative Setup (without Docker)

\`\`\`bash
npm install
# Ensure PostgreSQL is running and update .env with your connection string
npx prisma migrate deploy
npx prisma db seed
npm run dev
\`\`\`

## API Endpoints

[Reference the spec URL or list endpoints briefly]

## Running Tests

\`\`\`bash
npm test
\`\`\`

## Architecture & Design Decisions

- **Layered architecture**: Routes → Controllers → Services → Prisma
  separates HTTP concerns from business logic, making each layer
  independently testable.
- **Decimal for monetary values**: Using PostgreSQL NUMERIC(18,2) via
  Prisma Decimal to avoid floating-point precision issues with large
  fund amounts.
- **UUID primary keys**: Prevents enumeration attacks, matches the API
  spec, and is Postgres-native.
- **Zod validation**: Validates input AND generates TypeScript types
  from the same schema — single source of truth.
- **Consistent error format**: All errors return the same JSON structure
  with error code, message, and field-level details.
- **bypass_validation ignored by design**: The transaction spec includes
  a bypass_validation flag. This is intentionally not honoured as
  skipping validation based on client input is a security anti-pattern.

## Scaling Considerations

- Stateless design — horizontally scalable behind a load balancer
- Container-ready for Cloud Run / GKE deployment
- Prisma connection pooling handles concurrent requests
- Would add: rate limiting, API key auth, request logging, caching

## AI Tool Usage

I used Claude (via Claude Code in VS Code) throughout development:
- Architecture planning and technology choices
- Scaffolding project structure and boilerplate
- Writing Prisma schema and Zod validation schemas
- Generating test cases and edge case identification
- README and documentation drafting

All code was reviewed and understood before committing. AI was used
as a force multiplier for speed, while architectural decisions and
code review remained my responsibility.
```

---

## Makefile Commands

```makefile
dev:
	docker-compose up

build:
	docker-compose build

test:
	npm test

seed:
	npx prisma db seed

migrate:
	npx prisma migrate dev

lint:
	npx eslint src/ --ext .ts

format:
	npx prettier --write "src/**/*.ts"

clean:
	docker-compose down -v
```

---

## Key Patterns to Know (C# → TypeScript Translation)

| C# Concept | TypeScript Equivalent | Notes |
|---|---|---|
| `IActionResult` | `(req: Request, res: Response) => void` | Express handler signature |
| `[HttpGet]` attribute | `router.get('/path', handler)` | Explicit route registration |
| `services.AddScoped<T>()` | Import the module directly | No DI container needed at this scale |
| `DbContext` | `PrismaClient` singleton | Single import from `lib/prisma.ts` |
| `ModelState.IsValid` | Zod `.parse()` throws on invalid | Middleware catches and formats |
| `try/catch + StatusCode()` | `next(error)` → error middleware | Express error propagation |
| `async Task<T>` | `async (): Promise<T>` | Nearly identical syntax |
| `ILogger` | `console.log` or `pino` | Keep it simple for take-home |

---

## Pitfalls to Avoid

1. **Don't over-engineer**: No need for full DI, event sourcing, or CQRS. Clean layers are enough.
2. **Don't forget `await`**: Unlike C#, forgetting `await` in TS doesn't always cause a compiler error. Use the ESLint rule `@typescript-eslint/no-floating-promises`.
3. **Decimal serialisation**: Prisma returns `Decimal` objects, not numbers. Convert with `.toNumber()` or `.toString()` before sending as JSON. The spec shows `250000000.00` as a number, so use `.toNumber()`.
4. **Date serialisation**: The spec shows `investment_date` as `"2024-03-15"` (date only, no time). Prisma `@db.Date` handles this but the JSON response needs formatting.
5. **PUT semantics**: The spec puts ID in the body for PUT `/funds`. This is unconventional (normally in the URL) but follow the spec — mention in README that you noticed this.
6. **Empty arrays vs 404**: `GET /funds` with no funds should return `[]` (200), not 404. `GET /funds/:id` with wrong ID returns 404.
7. **Test database**: Use a separate DB for tests so tests don't pollute dev data.