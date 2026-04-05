import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import { prisma, resetDb } from './setup';

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /funds', () => {
  it('returns empty paginated response when no funds exist', async () => {
    const res = await request(app).get('/funds');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
    expect(res.body.totalPages).toBe(0);
  });

  it('returns all funds after creation', async () => {
    // Insert via API so the service layer invalidates the list cache
    await request(app).post('/fund').send({
      name: 'Seed Fund', vintage_year: 2023, target_size_usd: 50000000, status: 'Fundraising',
    });

    const res = await request(app).get('/funds');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Seed Fund');
    expect(typeof res.body.data[0].target_size_usd).toBe('number');
    expect(res.body.total).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  it('respects page and limit query params', async () => {
    const res = await request(app).get('/funds?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(5);
  });

  it('returns 400 for invalid pagination params', async () => {
    const res = await request(app).get('/funds?page=0&limit=5');
    expect(res.status).toBe(400);
  });
});

describe('POST /fund', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates a fund with valid data', async () => {
    const res = await request(app).post('/fund').send({
      name: 'Test Fund',
      vintage_year: 2024,
      target_size_usd: 100000000,
      status: 'Fundraising',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Test Fund');
    expect(res.body.vintage_year).toBe(2024);
    expect(res.body.target_size_usd).toBe(100000000);
    expect(res.body.status).toBe('Fundraising');
  });

  it('defaults status to Fundraising when omitted', async () => {
    const res = await request(app).post('/fund').send({
      name: 'No Status Fund',
      vintage_year: 2024,
      target_size_usd: 10000000,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Fundraising');
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app).post('/fund').send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
  });

  it('returns 400 for invalid status enum', async () => {
    const res = await request(app).post('/fund').send({
      name: 'Bad Status Fund',
      vintage_year: 2024,
      target_size_usd: 10000000,
      status: 'INVALID',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for negative target_size_usd', async () => {
    const res = await request(app).post('/fund').send({
      name: 'Negative Fund',
      vintage_year: 2024,
      target_size_usd: -1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /fund/:id', () => {
  let fundId: string;

  beforeAll(async () => {
    await resetDb();
    const fund = await prisma.fund.create({
      data: { name: 'Lookup Fund', vintage_year: 2023, target_size_usd: 20000000, status: 'Investing' },
    });
    fundId = fund.id;
  });

  it('returns a fund by id', async () => {
    const res = await request(app).get(`/fund/${fundId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(fundId);
    expect(res.body.name).toBe('Lookup Fund');
  });

  it('returns 404 for non-existent id', async () => {
    const res = await request(app).get('/fund/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid UUID format', async () => {
    const res = await request(app).get('/fund/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /fund/:id', () => {
  let fundId: string;

  beforeEach(async () => {
    await resetDb();
    const fund = await prisma.fund.create({
      data: { name: 'Update Fund', vintage_year: 2022, target_size_usd: 30000000, status: 'Fundraising' },
    });
    fundId = fund.id;
  });

  it('updates a fund with valid data', async () => {
    const res = await request(app).put(`/fund/${fundId}`).send({
      name: 'Updated Fund',
      vintage_year: 2023,
      target_size_usd: 40000000,
      status: 'Investing',
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Fund');
    expect(res.body.status).toBe('Investing');
  });

  it('returns 404 for non-existent fund id', async () => {
    const res = await request(app).put('/fund/00000000-0000-0000-0000-000000000000').send({
      name: 'Ghost Fund',
      vintage_year: 2024,
      target_size_usd: 10000000,
      status: 'Closed',
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid UUID in path', async () => {
    const res = await request(app).put('/fund/not-a-uuid').send({
      name: 'Bad ID Fund',
      vintage_year: 2024,
      target_size_usd: 10000000,
      status: 'Closed',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing required body fields', async () => {
    const res = await request(app).put(`/fund/${fundId}`).send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
  });
});
