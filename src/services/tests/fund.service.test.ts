import { FundService } from '@services/fund.service.js';
import { IFundRepository } from '@db/repositories/interfaces/fund-repository.interface.js';
import { FundNotFoundError, InfrastructureError, ValidationError } from '@errors/domain-errors.js';
import { Fund, FundStatus, Prisma } from '@prisma/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFund(overrides: Partial<Fund> = {}): Fund {
  return {
    id: 'fund-1',
    name: 'Alpha Fund',
    vintage_year: 2022,
    target_size_usd: new Prisma.Decimal(1_000_000),
    status: FundStatus.Fundraising,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeMockRepo(): jest.Mocked<IFundRepository> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

const PARAMS = { page: 1, limit: 20 };

// ── findAll ────────────────────────────────────────────────────────────────

describe('FundService.findAll', () => {
  it('returns a paginated response when funds exist', async () => {
    const repo = makeMockRepo();
    repo.findAll.mockResolvedValue({ data: [makeFund()], total: 1 });

    const result = await new FundService(repo).findAll(PARAMS);

    expect(result.isOk).toBe(true);
    expect(result.value.data).toHaveLength(1);
    expect(result.value.data[0]).toMatchObject({
      id: 'fund-1',
      name: 'Alpha Fund',
      vintage_year: 2022,
      target_size_usd: 1_000_000,
      status: 'Fundraising',
      created_at: '2024-01-01T00:00:00.000Z',
    });
    expect(result.value.total).toBe(1);
    expect(result.value.page).toBe(1);
    expect(result.value.limit).toBe(20);
    expect(result.value.totalPages).toBe(1);
  });

  it('returns an empty paginated response when no funds exist', async () => {
    const repo = makeMockRepo();
    repo.findAll.mockResolvedValue({ data: [], total: 0 });

    const result = await new FundService(repo).findAll(PARAMS);

    expect(result.isOk).toBe(true);
    expect(result.value.data).toEqual([]);
    expect(result.value.total).toBe(0);
    expect(result.value.totalPages).toBe(0);
  });

  it('calculates totalPages correctly across multiple pages', async () => {
    const repo = makeMockRepo();
    repo.findAll.mockResolvedValue({ data: [makeFund()], total: 45 });

    const result = await new FundService(repo).findAll({ page: 1, limit: 20 });

    expect(result.isOk).toBe(true);
    expect(result.value.totalPages).toBe(3); // ceil(45 / 20)
  });

  it('returns InfrastructureError when the repository throws', async () => {
    const repo = makeMockRepo();
    repo.findAll.mockRejectedValue(new Error('DB connection lost'));

    const result = await new FundService(repo).findAll(PARAMS);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
    expect(result.error.statusCode).toBe(500);
    expect(result.error.message).toBe('Failed to fetch funds');
  });
});

// ── findById ───────────────────────────────────────────────────────────────

describe('FundService.findById', () => {
  it('returns the fund DTO when found', async () => {
    const repo = makeMockRepo();
    repo.findById.mockResolvedValue(makeFund());

    const result = await new FundService(repo).findById('fund-1');

    expect(result.isOk).toBe(true);
    expect(result.value.id).toBe('fund-1');
    expect(result.value.target_size_usd).toBe(1_000_000);
    expect(repo.findById).toHaveBeenCalledWith('fund-1');
  });

  it('returns FundNotFoundError when the fund does not exist', async () => {
    const repo = makeMockRepo();
    repo.findById.mockResolvedValue(null);

    const result = await new FundService(repo).findById('missing-id');

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(FundNotFoundError);
    expect(result.error.statusCode).toBe(404);
    expect(result.error.code).toBe('NOT_FOUND');
  });

  it('returns InfrastructureError when the repository throws', async () => {
    const repo = makeMockRepo();
    repo.findById.mockRejectedValue(new Error('timeout'));

    const result = await new FundService(repo).findById('fund-1');

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
  });
});

// ── create ─────────────────────────────────────────────────────────────────

describe('FundService.create', () => {
  const input = {
    name: 'Beta Fund',
    vintage_year: 2023,
    target_size_usd: 5_000_000,
    status: 'Investing' as const,
  };

  it('creates a fund and returns its DTO', async () => {
    const repo = makeMockRepo();
    repo.create.mockResolvedValue(makeFund({ name: 'Beta Fund', status: FundStatus.Investing }));

    const result = await new FundService(repo).create(input);

    expect(result.isOk).toBe(true);
    expect(result.value.name).toBe('Beta Fund');
    expect(repo.create).toHaveBeenCalledWith(input);
  });

  it('returns ValidationError on Prisma unique-constraint violation (P2002)', async () => {
    const repo = makeMockRepo();
    repo.create.mockRejectedValue({ code: 'P2002' });

    const result = await new FundService(repo).create(input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.statusCode).toBe(400);
    expect(result.error.message).toMatch(/name and vintage year already exists/);
  });

  it('returns InfrastructureError for non-unique DB errors', async () => {
    const repo = makeMockRepo();
    repo.create.mockRejectedValue(new Error('disk full'));

    const result = await new FundService(repo).create(input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
    expect(result.error.statusCode).toBe(500);
  });
});

// ── update ─────────────────────────────────────────────────────────────────

describe('FundService.update', () => {
  const input = {
    id: 'fund-1',
    name: 'Updated Fund',
    vintage_year: 2023,
    target_size_usd: 2_000_000,
    status: 'Closed' as const,
  };

  it('updates and returns the fund DTO', async () => {
    const repo = makeMockRepo();
    repo.exists.mockResolvedValue(true);
    repo.update.mockResolvedValue(makeFund({ name: 'Updated Fund', status: FundStatus.Closed }));

    const result = await new FundService(repo).update(input);

    expect(result.isOk).toBe(true);
    expect(result.value.name).toBe('Updated Fund');
    const { id: _id, ...updateData } = input;
    expect(repo.update).toHaveBeenCalledWith('fund-1', updateData);
  });

  it('returns FundNotFoundError when the fund does not exist', async () => {
    const repo = makeMockRepo();
    repo.exists.mockResolvedValue(false);

    const result = await new FundService(repo).update(input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(FundNotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('returns ValidationError on Prisma unique-constraint violation (P2002)', async () => {
    const repo = makeMockRepo();
    repo.exists.mockResolvedValue(true);
    repo.update.mockRejectedValue({ code: 'P2002' });

    const result = await new FundService(repo).update(input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(ValidationError);
    expect(result.error.statusCode).toBe(400);
    expect(result.error.message).toMatch(/name and vintage year already exists/);
  });

  it('returns InfrastructureError when the repository update throws', async () => {
    const repo = makeMockRepo();
    repo.exists.mockResolvedValue(true);
    repo.update.mockRejectedValue(new Error('constraint violation'));

    const result = await new FundService(repo).update(input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
    expect(result.error.message).toBe('Failed to update fund');
  });
});
