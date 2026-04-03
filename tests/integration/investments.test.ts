import request from 'supertest';
import app from '../../src/app';
import { prisma, resetDb } from './setup';

let fundId: string;
let investorId: string;

beforeAll(async () => {
  await resetDb();

  const fund = await prisma.fund.create({
    data: { name: 'Test Fund', vintage_year: 2024, target_size_usd: 100000000, status: 'Fundraising' },
  });
  fundId = fund.id;

  const investor = await prisma.investor.create({
    data: { name: 'Test Investor', investor_type: 'Individual', email: 'investor@test.com' },
  });
  investorId = investor.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /funds/:fund_id/investments', () => {
  it('returns empty paginated response for fund with no investments', async () => {
    const res = await request(app).get(`/funds/${fundId}/investments`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
    expect(res.body.totalPages).toBe(0);
  });

  it('returns 404 for non-existent fund', async () => {
    const res = await request(app).get('/funds/00000000-0000-0000-0000-000000000000/investments');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid fund UUID format', async () => {
    const res = await request(app).get('/funds/not-a-uuid/investments');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('respects page and limit query params', async () => {
    const res = await request(app).get(`/funds/${fundId}/investments?page=1&limit=5`);
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(5);
  });
});

describe('POST /funds/:fund_id/investments', () => {
  beforeEach(async () => {
    await prisma.investment.deleteMany();
  });

  it('creates an investment with valid data', async () => {
    const res = await request(app)
      .post(`/funds/${fundId}/investments`)
      .send({
        investor_id: investorId,
        amount_usd: 5000000,
        investment_date: '2024-03-15',
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.fund_id).toBe(fundId);
    expect(res.body.investor_id).toBe(investorId);
    expect(res.body.amount_usd).toBe(5000000);
    expect(res.body.investment_date).toBe('2024-03-15');
  });

  it('returns the new investment in subsequent GET', async () => {
    await request(app)
      .post(`/funds/${fundId}/investments`)
      .send({ investor_id: investorId, amount_usd: 1000000, investment_date: '2024-06-01' });

    const res = await request(app).get(`/funds/${fundId}/investments`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('returns 404 for non-existent fund', async () => {
    const res = await request(app)
      .post('/funds/00000000-0000-0000-0000-000000000000/investments')
      .send({ investor_id: investorId, amount_usd: 1000000, investment_date: '2024-06-01' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for non-existent investor', async () => {
    const res = await request(app)
      .post(`/funds/${fundId}/investments`)
      .send({
        investor_id: '00000000-0000-0000-0000-000000000000',
        amount_usd: 1000000,
        investment_date: '2024-06-01',
      });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app)
      .post(`/funds/${fundId}/investments`)
      .send({ investor_id: investorId, amount_usd: 1000000, investment_date: '15-03-2024' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for negative amount', async () => {
    const res = await request(app)
      .post(`/funds/${fundId}/investments`)
      .send({ investor_id: investorId, amount_usd: -1000, investment_date: '2024-06-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid investor_id UUID', async () => {
    const res = await request(app)
      .post(`/funds/${fundId}/investments`)
      .send({ investor_id: 'bad-uuid', amount_usd: 1000000, investment_date: '2024-06-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid fund UUID in path', async () => {
    const res = await request(app)
      .post('/funds/bad-uuid/investments')
      .send({ investor_id: investorId, amount_usd: 1000000, investment_date: '2024-06-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
