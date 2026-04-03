# Titanbay API — Plan 4: API Documentation (Swagger / OpenAPI)

> Interactive API docs at `/api-docs`. Reviewers can test endpoints in the browser.

---

## The Standard: OpenAPI 3.0 + Swagger UI

The industry standard for REST API documentation is **OpenAPI 3.0**
(formerly Swagger). It gives you:

- Interactive UI where reviewers can send real requests without Postman
- Auto-generated from JSDoc comments in your route files
- Lives at `/api-docs` — one click in the browser
- Matches exactly what Titanbay used for their own API spec

### Install

```bash
npm i swagger-jsdoc swagger-ui-express
npm i -D @types/swagger-jsdoc @types/swagger-ui-express
```

---

## Setup

### 1. Swagger Config

```typescript
// config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Titanbay Private Markets API',
      version: '1.0.0',
      description:
        'RESTful API for managing private market funds, investors, and investments.',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development',
      },
    ],
    components: {
      schemas: {
        // ── Fund ──────────────────────────────────────
        Fund: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            name:            { type: 'string', example: 'Titanbay Growth Fund I' },
            vintage_year:    { type: 'integer', example: 2024 },
            target_size_usd: { type: 'number', format: 'double', example: 250000000.00 },
            status:          { type: 'string', enum: ['Fundraising', 'Investing', 'Closed'], example: 'Fundraising' },
            created_at:      { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
          },
        },
        CreateFundRequest: {
          type: 'object',
          required: ['name', 'vintage_year', 'target_size_usd', 'status'],
          properties: {
            name:            { type: 'string', example: 'Titanbay Growth Fund II', minLength: 1, maxLength: 255 },
            vintage_year:    { type: 'integer', example: 2025, minimum: 1900 },
            target_size_usd: { type: 'number', format: 'double', example: 500000000.00, minimum: 0, exclusiveMinimum: true },
            status:          { type: 'string', enum: ['Fundraising', 'Investing', 'Closed'], example: 'Fundraising' },
          },
        },
        UpdateFundRequest: {
          type: 'object',
          required: ['id', 'name', 'vintage_year', 'target_size_usd', 'status'],
          properties: {
            id:              { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            name:            { type: 'string', example: 'Titanbay Growth Fund I' },
            vintage_year:    { type: 'integer', example: 2024 },
            target_size_usd: { type: 'number', format: 'double', example: 300000000.00 },
            status:          { type: 'string', enum: ['Fundraising', 'Investing', 'Closed'], example: 'Investing' },
          },
        },

        // ── Investor ──────────────────────────────────
        Investor: {
          type: 'object',
          properties: {
            id:            { type: 'string', format: 'uuid', example: '770e8400-e29b-41d4-a716-446655440002' },
            name:          { type: 'string', example: 'Goldman Sachs Asset Management' },
            investor_type: { type: 'string', enum: ['Individual', 'Institution', 'Family Office'], example: 'Institution' },
            email:         { type: 'string', format: 'email', example: 'investments@gsam.com' },
            created_at:    { type: 'string', format: 'date-time', example: '2024-02-10T09:15:00Z' },
          },
        },
        CreateInvestorRequest: {
          type: 'object',
          required: ['name', 'investor_type', 'email'],
          properties: {
            name:          { type: 'string', example: 'CalPERS', minLength: 1, maxLength: 255 },
            investor_type: { type: 'string', enum: ['Individual', 'Institution', 'Family Office'], example: 'Institution' },
            email:         { type: 'string', format: 'email', example: 'privateequity@calpers.ca.gov' },
          },
        },

        // ── Investment ────────────────────────────────
        Investment: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid', example: '990e8400-e29b-41d4-a716-446655440004' },
            investor_id:     { type: 'string', format: 'uuid', example: '770e8400-e29b-41d4-a716-446655440002' },
            fund_id:         { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
            amount_usd:      { type: 'number', format: 'double', example: 50000000.00 },
            investment_date: { type: 'string', format: 'date', example: '2024-03-15' },
          },
        },
        CreateInvestmentRequest: {
          type: 'object',
          required: ['investor_id', 'amount_usd', 'investment_date'],
          properties: {
            investor_id:     { type: 'string', format: 'uuid', example: '770e8400-e29b-41d4-a716-446655440002' },
            amount_usd:      { type: 'number', format: 'double', example: 75000000.00, minimum: 0, exclusiveMinimum: true },
            investment_date: { type: 'string', format: 'date', example: '2024-09-22' },
          },
        },

        // ── Common ────────────────────────────────────
        PaginationMeta: {
          type: 'object',
          properties: {
            page:       { type: 'integer', example: 1 },
            limit:      { type: 'integer', example: 20 },
            total:      { type: 'integer', example: 147 },
            totalPages: { type: 'integer', example: 8 },
            hasNext:    { type: 'boolean', example: true },
            hasPrev:    { type: 'boolean', example: false },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code:    { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Validation failed. Check the details for specific field errors.' },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field:   { type: 'string', example: 'vintage_year' },
                      message: { type: 'string', example: 'Must be a positive integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', minimum: 1, default: 1 },
          description: 'Page number',
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          description: 'Items per page',
        },
      },
    },
  },
  // Path to route files containing JSDoc annotations
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

### 2. Mount in Express App

```typescript
// app.ts
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();

app.use(express.json());

// Swagger UI — interactive docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',  // hide top bar
  customSiteTitle: 'Titanbay API Docs',
}));

// Also serve raw OpenAPI JSON (useful for code generators)
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ... rest of app setup
```

---

## 3. JSDoc Annotations on Routes

Add these comments above each route definition. swagger-jsdoc reads them
and generates the spec automatically.

### Fund Routes

```typescript
// routes/fund.routes.ts
import { Router } from 'express';
import { FundController } from '../controllers/fund.controller';

const router = Router();
const controller = new FundController();

/**
 * @openapi
 * /funds:
 *   get:
 *     tags: [Funds]
 *     summary: List all funds
 *     description: Returns a paginated list of all funds, ordered by creation date (newest first).
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Paginated list of funds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Fund'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', controller.findAll);

/**
 * @openapi
 * /funds/{id}:
 *   get:
 *     tags: [Funds]
 *     summary: Get a specific fund
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Fund ID
 *     responses:
 *       200:
 *         description: Fund details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Fund'
 *       404:
 *         description: Fund not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', controller.findById);

/**
 * @openapi
 * /funds:
 *   post:
 *     tags: [Funds]
 *     summary: Create a new fund
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFundRequest'
 *     responses:
 *       201:
 *         description: Fund created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Fund'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', controller.create);

/**
 * @openapi
 * /funds:
 *   put:
 *     tags: [Funds]
 *     summary: Update an existing fund
 *     description: Full replacement update. The fund ID is provided in the request body.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateFundRequest'
 *     responses:
 *       200:
 *         description: Fund updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Fund'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Fund not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/', controller.update);

export default router;
```

### Investor Routes

```typescript
// routes/investor.routes.ts
import { Router } from 'express';
import { InvestorController } from '../controllers/investor.controller';

const router = Router();
const controller = new InvestorController();

/**
 * @openapi
 * /investors:
 *   get:
 *     tags: [Investors]
 *     summary: List all investors
 *     description: Returns a paginated list of all investors, ordered by creation date (newest first).
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Paginated list of investors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Investor'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */
router.get('/', controller.findAll);

/**
 * @openapi
 * /investors:
 *   post:
 *     tags: [Investors]
 *     summary: Create a new investor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvestorRequest'
 *     responses:
 *       201:
 *         description: Investor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Investor'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', controller.create);

export default router;
```

### Investment Routes

```typescript
// routes/investment.routes.ts
import { Router } from 'express';
import { InvestmentController } from '../controllers/investment.controller';

const router = Router();
const controller = new InvestmentController();

/**
 * @openapi
 * /funds/{fund_id}/investments:
 *   get:
 *     tags: [Investments]
 *     summary: List all investments for a fund
 *     description: Returns a paginated list of all investments made into a specific fund.
 *     parameters:
 *       - in: path
 *         name: fund_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Fund ID
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Paginated list of investments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Investment'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       404:
 *         description: Fund not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:fund_id/investments', controller.findByFundId);

/**
 * @openapi
 * /funds/{fund_id}/investments:
 *   post:
 *     tags: [Investments]
 *     summary: Create a new investment
 *     description: Create a new investment into a specific fund. Both the fund and investor must exist.
 *     parameters:
 *       - in: path
 *         name: fund_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Fund ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvestmentRequest'
 *     responses:
 *       201:
 *         description: Investment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Investment'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Fund or investor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:fund_id/investments', controller.create);

export default router;
```

---

## 4. Health Check Endpoint

```typescript
// routes/health.routes.ts

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Returns API status and uptime. Use to verify the service is running.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 uptime:
 *                   type: number
 *                   example: 1234.56
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
```

---

## 5. Updated Project Structure

```
src/
├── config/
│   └── swagger.ts          # ★ OpenAPI spec definition + schemas
├── routes/
│   ├── fund.routes.ts      # ★ JSDoc @openapi annotations added
│   ├── investor.routes.ts  # ★ JSDoc @openapi annotations added
│   ├── investment.routes.ts # ★ JSDoc @openapi annotations added
│   └── health.routes.ts
└── app.ts                  # ★ Mount swagger-ui at /api-docs
```

---

## 6. What the Reviewer Sees

After `docker-compose up`, the reviewer opens `http://localhost:3000/api-docs`
and gets:

- Three expandable sections: **Funds**, **Investors**, **Investments**
- Each endpoint shows method, path, parameters, request body schema,
  and all possible response codes
- A **"Try it out"** button on every endpoint that lets them send real
  requests and see live responses
- Pre-filled example values matching the original API spec (so they
  can click "Execute" immediately)
- The error response schema visible on every endpoint

No Postman, no curl, no setup. Open browser, click, test.

---

## 7. README Addition

```markdown
## API Documentation

Interactive Swagger UI is available at:

  http://localhost:3000/api-docs

The raw OpenAPI 3.0 spec is available at:

  http://localhost:3000/api-docs.json

All endpoints can be tested directly from the Swagger UI — click
"Try it out" on any endpoint, modify the example values, and hit
"Execute" to send a real request.
```