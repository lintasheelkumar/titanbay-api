import { Request, Response, NextFunction } from 'express';
import { InvestmentController } from '@controllers/investment.controller.js';
import { IInvestmentService } from '@services/interfaces/investment.service.interface.js';
import { FundNotFoundError, InfrastructureError, InvestorNotFoundError } from '@errors/domain-errors.js';
import { Result } from '@lib/result.js';
import { InvestmentResponseDto } from '@dtos/investment.dto.js';
import { PaginatedResponse } from '@lib/pagination.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {
    json: jest.fn(),
    status: jest.fn(),
  };
  (res.status as jest.Mock).mockReturnValue(res);
  return res as unknown as Response;
}

function makeNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return { query: {}, params: {}, body: {}, ...overrides } as unknown as Request;
}

function makeMockService(): jest.Mocked<IInvestmentService> {
  return {
    findByFund: jest.fn(),
    create: jest.fn(),
  };
}

const FUND_UUID     = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const INVESTOR_UUID = 'b1ffcd00-0d1c-4f99-bc7e-7cc0ce491b22';

const INVESTMENT_DTO: InvestmentResponseDto = {
  id: 'inv-uuid-1',
  fund_id: FUND_UUID,
  investor_id: INVESTOR_UUID,
  amount_usd: 250_000,
  investment_date: '2024-06-15',
};

const PAGINATED: PaginatedResponse<InvestmentResponseDto> = {
  data: [INVESTMENT_DTO],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

// ── listInvestments ────────────────────────────────────────────────────────

describe('InvestmentController.listInvestments', () => {
  it('calls service.findByFund with fund_id and parsed params, returns 200', async () => {
    const service = makeMockService();
    service.findByFund.mockResolvedValue(Result.ok(PAGINATED));
    const res = makeRes();

    await new InvestmentController(service).listInvestments(
      makeReq({ params: { fund_id: FUND_UUID }, query: { page: '1', limit: '20' } }),
      res,
      makeNext(),
    );

    expect(service.findByFund).toHaveBeenCalledWith(FUND_UUID, { page: 1, limit: 20 });
    expect(res.json).toHaveBeenCalledWith(PAGINATED);
  });

  it('uses pagination defaults when query params are omitted', async () => {
    const service = makeMockService();
    service.findByFund.mockResolvedValue(Result.ok(PAGINATED));

    await new InvestmentController(service).listInvestments(
      makeReq({ params: { fund_id: FUND_UUID } }),
      makeRes(),
      makeNext(),
    );

    expect(service.findByFund).toHaveBeenCalledWith(FUND_UUID, { page: 1, limit: 20 });
  });

  it('returns 404 when the service returns FundNotFoundError', async () => {
    const service = makeMockService();
    service.findByFund.mockResolvedValue(Result.fail(new FundNotFoundError(FUND_UUID)));
    const res = makeRes();

    await new InvestmentController(service).listInvestments(
      makeReq({ params: { fund_id: FUND_UUID } }),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: expect.stringContaining(FUND_UUID) },
    });
  });

  it('returns 500 when the service returns InfrastructureError', async () => {
    const service = makeMockService();
    service.findByFund.mockResolvedValue(Result.fail(new InfrastructureError('DB timeout')));
    const res = makeRes();

    await new InvestmentController(service).listInvestments(
      makeReq({ params: { fund_id: FUND_UUID } }),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'DB timeout' },
    });
  });

  it('calls next() when fund_id is not a valid UUID', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new InvestmentController(service).listInvestments(
      makeReq({ params: { fund_id: 'not-a-uuid' } }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.findByFund).not.toHaveBeenCalled();
  });
});

// ── createInvestment ───────────────────────────────────────────────────────

describe('InvestmentController.createInvestment', () => {
  const VALID_BODY = {
    investor_id: INVESTOR_UUID,
    amount_usd: 250_000,
    investment_date: '2024-06-15',
  };

  it('returns 201 with the created investment on success', async () => {
    const service = makeMockService();
    service.create.mockResolvedValue(Result.ok(INVESTMENT_DTO));
    const res = makeRes();

    await new InvestmentController(service).createInvestment(
      makeReq({ params: { fund_id: FUND_UUID }, body: VALID_BODY }),
      res,
      makeNext(),
    );

    expect(service.create).toHaveBeenCalledWith(FUND_UUID, VALID_BODY);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(INVESTMENT_DTO);
  });

  it('returns 404 when the service returns FundNotFoundError', async () => {
    const service = makeMockService();
    service.create.mockResolvedValue(Result.fail(new FundNotFoundError(FUND_UUID)));
    const res = makeRes();

    await new InvestmentController(service).createInvestment(
      makeReq({ params: { fund_id: FUND_UUID }, body: VALID_BODY }),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 404 when the service returns InvestorNotFoundError', async () => {
    const service = makeMockService();
    service.create.mockResolvedValue(Result.fail(new InvestorNotFoundError(INVESTOR_UUID)));
    const res = makeRes();

    await new InvestmentController(service).createInvestment(
      makeReq({ params: { fund_id: FUND_UUID }, body: VALID_BODY }),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: expect.stringContaining(INVESTOR_UUID) },
    });
  });

  it('calls next() when the body fails Zod validation', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new InvestmentController(service).createInvestment(
      makeReq({
        params: { fund_id: FUND_UUID },
        body: { investor_id: INVESTOR_UUID, amount_usd: -100, investment_date: '2024-06-15' },
      }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('calls next() when investment_date format is invalid', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new InvestmentController(service).createInvestment(
      makeReq({
        params: { fund_id: FUND_UUID },
        body: { investor_id: INVESTOR_UUID, amount_usd: 100_000, investment_date: '15-06-2024' },
      }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('calls next() when fund_id is not a valid UUID', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new InvestmentController(service).createInvestment(
      makeReq({ params: { fund_id: 'bad-id' }, body: VALID_BODY }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });
});
