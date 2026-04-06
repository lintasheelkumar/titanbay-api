import { InvestorService } from '@services/investor.service.js';
import { IInvestorRepository } from '@db/repositories/interfaces/investor-repository.interface.js';
import { DuplicateEmailError, InfrastructureError } from '@errors/domain-errors.js';
import { Investor, InvestorType } from '@prisma/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeInvestor(overrides: Partial<Investor> = {}): Investor {
  return {
    id: 'investor-1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    investor_type: InvestorType.Individual,
    created_at: new Date('2024-03-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeMockRepo(): jest.Mocked<IInvestorRepository> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
}

const PARAMS = { page: 1, limit: 20 };

// ── findAll ────────────────────────────────────────────────────────────────

describe('InvestorService.findAll', () => {
  it('returns a paginated list of investor DTOs', async () => {
    const repo = makeMockRepo();
    repo.findAll.mockResolvedValue({ data: [makeInvestor()], total: 1 });

    const result = await new InvestorService(repo).findAll(PARAMS);

    expect(result.isOk).toBe(true);
    expect(result.value.data).toHaveLength(1);
    expect(result.value.data[0]).toMatchObject({
      id: 'investor-1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      investor_type: 'Individual',
      created_at: '2024-03-01T00:00:00.000Z',
    });
    expect(result.value.total).toBe(1);
    expect(result.value.page).toBe(1);
    expect(result.value.limit).toBe(20);
    expect(result.value.totalPages).toBe(1);
  });

  it('maps InvestorType enum values to display strings correctly', async () => {
    const repo = makeMockRepo();
    repo.findAll.mockResolvedValue({
      data: [
        makeInvestor({ id: 'i-1', investor_type: InvestorType.Individual }),
        makeInvestor({ id: 'i-2', investor_type: InvestorType.Institution }),
        makeInvestor({ id: 'i-3', investor_type: InvestorType.Family_Office }),
      ],
      total: 3,
    });

    const result = await new InvestorService(repo).findAll(PARAMS);

    expect(result.isOk).toBe(true);
    expect(result.value.data.map((d) => d.investor_type)).toEqual([
      'Individual',
      'Institution',
      'Family Office',
    ]);
  });

  it('returns an empty paginated response when no investors exist', async () => {
    const repo = makeMockRepo();
    repo.findAll.mockResolvedValue({ data: [], total: 0 });

    const result = await new InvestorService(repo).findAll(PARAMS);

    expect(result.isOk).toBe(true);
    expect(result.value.data).toEqual([]);
    expect(result.value.totalPages).toBe(0);
  });

  it('returns InfrastructureError when the repository throws', async () => {
    const repo = makeMockRepo();
    repo.findAll.mockRejectedValue(new Error('connection refused'));

    const result = await new InvestorService(repo).findAll(PARAMS);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
    expect(result.error.statusCode).toBe(500);
    expect(result.error.message).toBe('Failed to fetch investors');
  });
});

// ── create ─────────────────────────────────────────────────────────────────

describe('InvestorService.create', () => {
  const input = {
    name: 'Bob Jones',
    email: 'bob@example.com',
    investor_type: 'Individual' as const,
  };

  it('creates and returns the investor DTO', async () => {
    const repo = makeMockRepo();
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockResolvedValue(
      makeInvestor({ name: 'Bob Jones', email: 'bob@example.com' }),
    );

    const result = await new InvestorService(repo).create(input);

    expect(result.isOk).toBe(true);
    expect(result.value.name).toBe('Bob Jones');
    expect(result.value.email).toBe('bob@example.com');
    expect(repo.findByEmail).toHaveBeenCalledWith('bob@example.com');
    expect(repo.create).toHaveBeenCalledWith(input);
  });

  it('returns DuplicateEmailError when the email is already registered', async () => {
    const repo = makeMockRepo();
    repo.findByEmail.mockResolvedValue(makeInvestor());

    const result = await new InvestorService(repo).create(input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(DuplicateEmailError);
    expect(result.error.statusCode).toBe(409);
    expect(result.error.code).toBe('CONFLICT');
    expect(result.error.message).toMatch('bob@example.com');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns InfrastructureError when the repository create throws', async () => {
    const repo = makeMockRepo();
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockRejectedValue(new Error('disk full'));

    const result = await new InvestorService(repo).create(input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
    expect(result.error.statusCode).toBe(500);
    expect(result.error.message).toBe('Failed to create investor');
  });
});
