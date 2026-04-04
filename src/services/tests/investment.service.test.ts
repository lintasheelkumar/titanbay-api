import { describe, it, expect, jest } from '@jest/globals';
import { InvestmentService } from '../investment.service.js';
import { IInvestmentRepository } from '../../database/repositories/interfaces/investment-repository.interface.js';
import { IFundRepository } from '../../database/repositories/interfaces/fund-repository.interface.js';
import { IInvestorRepository } from '../../database/repositories/interfaces/investor-repository.interface.js';
import {
  FundNotFoundError,
  InfrastructureError,
  InvestorNotFoundError,
} from '../../errors/domain-errors.js';
import { Investment, Investor, InvestorType } from '@prisma/client';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeInvestment(overrides: Partial<Investment> = {}): Investment {
  return {
    id: 'inv-1',
    fund_id: 'fund-1',
    investor_id: 'investor-1',
    amount_usd: { toNumber: () => 250_000 } as any,
    investment_date: new Date('2024-06-15T00:00:00.000Z'),
    ...overrides,
  };
}

function makeInvestor(overrides: Partial<Investor> = {}): Investor {
  return {
    id: 'investor-1',
    name: 'Alice Smith',
    email: 'alice@example.com',
    investor_type: InvestorType.Individual,
    created_at: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeMockInvestmentRepo(): jest.Mocked<IInvestmentRepository> {
  return {
    findByFund: jest.fn(),
    create: jest.fn(),
  };
}

function makeMockFundRepo(): jest.Mocked<IFundRepository> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

function makeMockInvestorRepo(): jest.Mocked<IInvestorRepository> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
}

const PARAMS = { page: 1, limit: 20 };

// ── findByFund ─────────────────────────────────────────────────────────────

describe('InvestmentService.findByFund', () => {
  it('returns a paginated list of investment DTOs for a valid fund', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(true);
    investmentRepo.findByFund.mockResolvedValue({ data: [makeInvestment()], total: 1 });

    const result = await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .findByFund('fund-1', PARAMS);

    expect(result.isOk).toBe(true);
    expect(result.value.data).toHaveLength(1);
    expect(result.value.data[0]).toMatchObject({
      id: 'inv-1',
      fund_id: 'fund-1',
      investor_id: 'investor-1',
      amount_usd: 250_000,
      investment_date: '2024-06-15',
    });
    expect(result.value.total).toBe(1);
    expect(result.value.totalPages).toBe(1);
    expect(fundRepo.exists).toHaveBeenCalledWith('fund-1');
    expect(investmentRepo.findByFund).toHaveBeenCalledWith('fund-1', PARAMS);
  });

  it('returns an empty paginated response when the fund has no investments', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(true);
    investmentRepo.findByFund.mockResolvedValue({ data: [], total: 0 });

    const result = await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .findByFund('fund-1', PARAMS);

    expect(result.isOk).toBe(true);
    expect(result.value.data).toEqual([]);
    expect(result.value.totalPages).toBe(0);
  });

  it('returns FundNotFoundError when the fund does not exist', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(false);

    const result = await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .findByFund('missing-fund', PARAMS);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(FundNotFoundError);
    expect(result.error.statusCode).toBe(404);
    expect(result.error.code).toBe('NOT_FOUND');
    expect(investmentRepo.findByFund).not.toHaveBeenCalled();
  });

  it('returns InfrastructureError when the repository throws', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(true);
    investmentRepo.findByFund.mockRejectedValue(new Error('DB timeout'));

    const result = await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .findByFund('fund-1', PARAMS);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
    expect(result.error.statusCode).toBe(500);
    expect(result.error.message).toBe('Failed to fetch investments');
  });
});

// ── create ─────────────────────────────────────────────────────────────────

describe('InvestmentService.create', () => {
  const input = {
    investor_id: 'investor-1',
    amount_usd: 250_000,
    investment_date: '2024-06-15',
  };

  it('creates and returns the investment DTO', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(true);
    investorRepo.findById.mockResolvedValue(makeInvestor());
    investmentRepo.create.mockResolvedValue(makeInvestment());

    const result = await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .create('fund-1', input);

    expect(result.isOk).toBe(true);
    expect(result.value).toMatchObject({
      id: 'inv-1',
      fund_id: 'fund-1',
      investor_id: 'investor-1',
      amount_usd: 250_000,
      investment_date: '2024-06-15',
    });
    expect(investmentRepo.create).toHaveBeenCalledWith('fund-1', input);
  });

  it('checks fund and investor existence in parallel', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(true);
    investorRepo.findById.mockResolvedValue(makeInvestor());
    investmentRepo.create.mockResolvedValue(makeInvestment());

    await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .create('fund-1', input);

    // Both lookups should have been called (Promise.all)
    expect(fundRepo.exists).toHaveBeenCalledWith('fund-1');
    expect(investorRepo.findById).toHaveBeenCalledWith('investor-1');
  });

  it('returns FundNotFoundError when the fund does not exist', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(false);
    investorRepo.findById.mockResolvedValue(makeInvestor());

    const result = await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .create('missing-fund', input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(FundNotFoundError);
    expect(result.error.statusCode).toBe(404);
    expect(investmentRepo.create).not.toHaveBeenCalled();
  });

  it('returns InvestorNotFoundError when the investor does not exist', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(true);
    investorRepo.findById.mockResolvedValue(null);

    const result = await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .create('fund-1', input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InvestorNotFoundError);
    expect(result.error.statusCode).toBe(404);
    expect(investmentRepo.create).not.toHaveBeenCalled();
  });

  it('returns InfrastructureError when the repository create throws', async () => {
    const investmentRepo = makeMockInvestmentRepo();
    const fundRepo = makeMockFundRepo();
    const investorRepo = makeMockInvestorRepo();

    fundRepo.exists.mockResolvedValue(true);
    investorRepo.findById.mockResolvedValue(makeInvestor());
    investmentRepo.create.mockRejectedValue(new Error('constraint error'));

    const result = await new InvestmentService(investmentRepo, fundRepo, investorRepo)
      .create('fund-1', input);

    expect(result.isErr).toBe(true);
    expect(result.error).toBeInstanceOf(InfrastructureError);
    expect(result.error.statusCode).toBe(500);
    expect(result.error.message).toBe('Failed to create investment');
  });
});
