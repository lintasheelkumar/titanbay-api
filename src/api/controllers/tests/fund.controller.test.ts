import { describe, it, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { FundController } from '@controllers/fund.controller.js';
import { IFundService } from '@services/interfaces/fund.service.interface.js';
import { FundNotFoundError, InfrastructureError, ValidationError } from '@errors/domain-errors.js';
import { Result } from '@lib/result.js';
import { FundResponseDto } from '@dtos/fund.dto.js';
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

function makeMockService(): jest.Mocked<IFundService> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
}

const FUND_DTO: FundResponseDto = {
  id: 'fund-uuid-1',
  name: 'Alpha Fund',
  vintage_year: 2022,
  target_size_usd: 1_000_000,
  status: 'Fundraising' as any,
  created_at: '2024-01-01T00:00:00.000Z',
};

const PAGINATED: PaginatedResponse<FundResponseDto> = {
  data: [FUND_DTO],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

// ── listFunds ──────────────────────────────────────────────────────────────

describe('FundController.listFunds', () => {
  it('calls service.findAll with parsed params and returns 200 with data', async () => {
    const service = makeMockService();
    service.findAll.mockResolvedValue(Result.ok(PAGINATED));
    const res = makeRes();
    const next = makeNext();

    await new FundController(service).listFunds(
      makeReq({ query: { page: '1', limit: '20' } }),
      res,
      next,
    );

    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(res.json).toHaveBeenCalledWith(PAGINATED);
    expect(next).not.toHaveBeenCalled();
  });

  it('uses pagination defaults when query params are omitted', async () => {
    const service = makeMockService();
    service.findAll.mockResolvedValue(Result.ok(PAGINATED));

    await new FundController(service).listFunds(makeReq(), makeRes(), makeNext());

    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('returns the service error status and body when service fails', async () => {
    const service = makeMockService();
    service.findAll.mockResolvedValue(Result.fail(new InfrastructureError('DB down')));
    const res = makeRes();

    await new FundController(service).listFunds(makeReq(), res, makeNext());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'DB down' },
    });
  });

  it('calls next() when Zod throws on invalid query', async () => {
    const service = makeMockService();
    const next = makeNext();

    // page must be >= 1; passing 0 triggers a Zod error
    await new FundController(service).listFunds(
      makeReq({ query: { page: '0' } }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
  });
});

// ── getFund ────────────────────────────────────────────────────────────────

describe('FundController.getFund', () => {
  const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  it('returns the fund DTO for a valid UUID', async () => {
    const service = makeMockService();
    service.findById.mockResolvedValue(Result.ok(FUND_DTO));
    const res = makeRes();

    await new FundController(service).getFund(
      makeReq({ params: { id: VALID_UUID } }),
      res,
      makeNext(),
    );

    expect(service.findById).toHaveBeenCalledWith(VALID_UUID);
    expect(res.json).toHaveBeenCalledWith(FUND_DTO);
  });

  it('returns 404 when the service returns FundNotFoundError', async () => {
    const service = makeMockService();
    service.findById.mockResolvedValue(Result.fail(new FundNotFoundError(VALID_UUID)));
    const res = makeRes();

    await new FundController(service).getFund(
      makeReq({ params: { id: VALID_UUID } }),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: expect.stringContaining(VALID_UUID) },
    });
  });

  it('calls next() when the id param is not a valid UUID', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new FundController(service).getFund(
      makeReq({ params: { id: 'not-a-uuid' } }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.findById).not.toHaveBeenCalled();
  });
});

// ── createFund ─────────────────────────────────────────────────────────────

describe('FundController.createFund', () => {
  const VALID_BODY = {
    name: 'Beta Fund',
    vintage_year: 2023,
    target_size_usd: 5_000_000,
    status: 'Investing',
  };

  it('returns 201 with the created fund on success', async () => {
    const service = makeMockService();
    service.create.mockResolvedValue(Result.ok(FUND_DTO));
    const res = makeRes();

    await new FundController(service).createFund(
      makeReq({ body: VALID_BODY }),
      res,
      makeNext(),
    );

    expect(service.create).toHaveBeenCalledWith(VALID_BODY);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(FUND_DTO);
  });

  it('returns 400 when the service returns a ValidationError', async () => {
    const service = makeMockService();
    service.create.mockResolvedValue(
      Result.fail(new ValidationError('A fund with this name already exists')),
    );
    const res = makeRes();

    await new FundController(service).createFund(makeReq({ body: VALID_BODY }), res, makeNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'A fund with this name already exists' },
    });
  });

  it('calls next() when the body fails Zod validation', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new FundController(service).createFund(
      makeReq({ body: { name: '' } }), // missing required fields
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });
});

// ── updateFund ─────────────────────────────────────────────────────────────

describe('FundController.updateFund', () => {
  const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const VALID_BODY = {
    name: 'Updated Fund',
    vintage_year: 2023,
    target_size_usd: 2_000_000,
    status: 'Closed',
  };

  it('returns the updated fund DTO on success', async () => {
    const service = makeMockService();
    service.update.mockResolvedValue(Result.ok({ ...FUND_DTO, name: 'Updated Fund' }));
    const res = makeRes();

    await new FundController(service).updateFund(
      makeReq({ params: { id: VALID_UUID }, body: VALID_BODY }),
      res,
      makeNext(),
    );

    expect(service.update).toHaveBeenCalledWith({ id: VALID_UUID, ...VALID_BODY });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Fund' }));
  });

  it('returns 404 when the service returns FundNotFoundError', async () => {
    const service = makeMockService();
    service.update.mockResolvedValue(Result.fail(new FundNotFoundError(VALID_UUID)));
    const res = makeRes();

    await new FundController(service).updateFund(
      makeReq({ params: { id: VALID_UUID }, body: VALID_BODY }),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('calls next() when the path id is not a valid UUID', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new FundController(service).updateFund(
      makeReq({ params: { id: 'not-a-uuid' }, body: VALID_BODY }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
  });

  it('calls next() when the body fails Zod validation', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new FundController(service).updateFund(
      makeReq({ params: { id: VALID_UUID }, body: { name: '' } }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.update).not.toHaveBeenCalled();
  });
});
