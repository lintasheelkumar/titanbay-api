import request from 'supertest';
import app from '../../src/app';
import { prisma, resetDb } from './setup';

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /investors', () => {
  it('returns empty paginated response when no investors exist', async () => {
    const res = await request(app).get('/investors');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
    expect(res.body.totalPages).toBe(0);
  });

  it('respects page and limit query params', async () => {
    const res = await request(app).get('/investors?page=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it('returns 400 for invalid pagination params', async () => {
    const res = await request(app).get('/investors?limit=0');
    expect(res.status).toBe(400);
  });
});

describe('POST /investors', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('creates an Individual investor', async () => {
    const res = await request(app).post('/investors').send({
      name: 'Alice Pemberton',
      investor_type: 'Individual',
      email: 'alice@example.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Alice Pemberton');
    expect(res.body.investor_type).toBe('Individual');
    expect(res.body.email).toBe('alice@example.com');
  });

  it('creates a Family Office investor', async () => {
    const res = await request(app).post('/investors').send({
      name: 'Hartwell Family',
      investor_type: 'Family Office',
      email: 'office@hartwell.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.investor_type).toBe('Family Office');
  });

  it('creates an Institution investor', async () => {
    const res = await request(app).post('/investors').send({
      name: 'Global Capital',
      investor_type: 'Institution',
      email: 'invest@globalcap.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.investor_type).toBe('Institution');
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/investors').send({
      name: 'First Investor',
      investor_type: 'Individual',
      email: 'dupe@example.com',
    });

    const res = await request(app).post('/investors').send({
      name: 'Second Investor',
      investor_type: 'Individual',
      email: 'dupe@example.com',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/investors').send({
      name: 'Bad Email',
      investor_type: 'Individual',
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid investor_type', async () => {
    const res = await request(app).post('/investors').send({
      name: 'Bad Type',
      investor_type: 'Corporation',
      email: 'corp@example.com',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/investors').send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
