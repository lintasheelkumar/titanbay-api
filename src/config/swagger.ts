import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Titanbay Private Markets API',
      version: '1.0.0',
      description: 'RESTful API for managing private market funds, investors, and investments.',
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
          required: ['name', 'vintage_year', 'target_size_usd', 'status'],
          properties: {
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
  apis: ['./dist/api/routes/*.js', './dist/app.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
