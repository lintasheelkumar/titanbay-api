# Folder Structure Migration Plan

> Restructure from flat layout to 3-layer architecture.
> Everything else (services, repos, decorators, etc.) is already implemented.

---

## Architecture Layers

```
┌─────────────────────────────────────┐
│  api/          Layer 1: HTTP        │  controllers, routes, schemas, dtos, middlewares
├─────────────────────────────────────┤
│  services/     Layer 2: Business    │  pure logic, transport-agnostic
├─────────────────────────────────────┤
│  database/     Layer 3: Data Access │  repositories, Prisma client
└─────────────────────────────────────┘
  decorators/    Cross-cutting         caching + logging wrappers
  lib/           Infrastructure        cache, logger, Result, pagination
  errors/        Domain errors         typed error hierarchy
  constants/     Static values         tokens, enums, messages
  loaders/       Bootstrap             Express, DI, Swagger, Prisma setup
```

Dependency rule: api/ → services/ → database/. Never the reverse.

**Services stay at `src/services/`, NOT inside `api/`.** Services are
business logic — they should be callable from REST, CLI, queue workers,
or GraphQL. Burying them inside the HTTP layer violates Clean Architecture
and blocks reuse.

---

## Current → Revised Mapping

| Current Path | New Path |
|---|---|
| `src/controllers/` | `src/api/controllers/` |
| `src/dtos/` | `src/api/dtos/` |
| `src/middleware/` | `src/api/middlewares/` |
| `src/routes/` | `src/api/routes/` |
| `src/schemas/` | `src/api/schemas/` |
| `src/services/` | `src/services/` ← **stays at root level** |
| `src/repositories/` | `src/database/repositories/` |
| `src/lib/prisma.ts` | `src/database/PrismaClient.ts` |
| `src/container.ts` | `src/loaders/ContainerLoader.ts` |
| — | `src/loaders/ExpressLoader.ts` (extract from app.ts) |
| — | `src/loaders/SwaggerLoader.ts` (extract from app.ts) |
| — | `src/loaders/PrismaLoader.ts` (extract from app.ts) |

## What Does NOT Move

- `prisma/` — stays at project root (Prisma CLI expects it here)
- `ai-context/` — stays at project root
- `src/services/` — stays at `src/` level (business logic, not HTTP)
- `src/config/` — stays
- `src/constants/` — stays
- `src/errors/` — stays
- `src/lib/` — stays (except prisma.ts → database/)
- `src/types/` — stays
- `src/app.ts` — stays (refactored to use loaders)
- `src/index.ts` — stays
- `tests/` — stays

## New Directories to Create

1. `src/api/` — move controllers, dtos, middlewares, routes, schemas into it
2. `src/database/` — move repositories into it, move prisma.ts here as PrismaClient.ts
3. `src/loaders/` — split container.ts and app.ts bootstrap logic into focused loaders
4. `src/decorators/` — move caching/logging service wrappers here (if currently inside services/)

## Final Structure

```
titanbay-api/
├── ai-context/                         # Untouched
├── prisma/                             # Untouched — stays at root
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── api/                            # Layer 1: HTTP boundary
│   │   ├── controllers/
│   │   ├── dtos/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   └── schemas/
│   │
│   ├── services/                       # Layer 2: Business logic (root level!)
│   │   ├── interfaces/
│   │   │   ├── IFundService.ts
│   │   │   ├── IInvestorService.ts
│   │   │   └── IInvestmentService.ts
│   │   ├── FundService.ts
│   │   ├── InvestorService.ts
│   │   └── InvestmentService.ts
│   │
│   ├── database/                       # Layer 3: Data access
│   │   ├── repositories/
│   │   │   ├── interfaces/
│   │   │   │   ├── IFundRepository.ts
│   │   │   │   ├── IInvestorRepository.ts
│   │   │   │   └── IInvestmentRepository.ts
│   │   │   ├── PrismaFundRepository.ts
│   │   │   ├── PrismaInvestorRepository.ts
│   │   │   └── PrismaInvestmentRepository.ts
│   │   └── PrismaClient.ts
│   │
│   ├── decorators/                     # Cross-cutting: cache + logging wrappers
│   │   ├── CachingFundService.ts
│   │   ├── LoggingFundService.ts
│   │   └── ...
│   │
│   ├── config/
│   ├── constants/
│   ├── errors/
│   ├── lib/
│   ├── loaders/                        # App bootstrap
│   │   ├── ExpressLoader.ts
│   │   ├── ContainerLoader.ts
│   │   ├── SwaggerLoader.ts
│   │   └── PrismaLoader.ts
│   ├── types/
│   ├── app.ts
│   └── index.ts
│
├── tests/
├── docker-compose.yml
├── Dockerfile
└── ...config files
```

## app.ts After Refactor

```typescript
import express from 'express';
import { loadPrisma } from './loaders/PrismaLoader';
import { loadContainer } from './loaders/ContainerLoader';
import { loadExpress } from './loaders/ExpressLoader';
import { loadSwagger } from './loaders/SwaggerLoader';

export async function createApp() {
  const app = express();
  await loadPrisma();
  loadContainer();
  loadExpress(app);
  loadSwagger(app);
  return app;
}
```

## Steps to Execute

1. Create empty dirs: `src/api`, `src/database`, `src/loaders`, `src/decorators`
2. Move into `src/api/`: controllers, dtos, middlewares, routes, schemas (NOT services)
3. Move into `src/database/`: repositories, prisma client
4. `src/services/` stays where it is — do NOT move into api/
5. Move caching/logging decorators into `src/decorators/`
6. Split `container.ts` → `src/loaders/ContainerLoader.ts`
7. Extract Express setup from `app.ts` → `src/loaders/ExpressLoader.ts`
8. Extract Swagger setup → `src/loaders/SwaggerLoader.ts`
9. Extract Prisma connection → `src/loaders/PrismaLoader.ts`
10. Update all import paths
11. Delete old `container.ts`
12. Verify: `docker-compose up` → all endpoints work → tests pass