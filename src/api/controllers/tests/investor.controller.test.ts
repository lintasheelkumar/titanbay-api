import { describe, it, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { InvestorController } from '@controllers/investor.controller.js';
import { IInvestorService } from '@services/interfaces/investor.service.interface.js';
import { DuplicateEmailError, InfrastructureError } from '@errors/domain-errors.js';
import { Result } from '@lib/result.js';
import { InvestorResponseDto } from '@dtos/investor.dto.js';
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

function makeMockService(): jest.Mocked<IInvestorService> {
  return {
    findAll: jest.fn(),
    create: jest.fn(),
  };
}

const INVESTOR_DTO: InvestorResponseDto = {
  id: 'investor-uuid-1',
  name: 'Alice Smith',
  investor_type: 'Individual',
  email: 'alice@example.com',
  created_at: '2024-03-01T00:00:00.000Z',
};

const PAGINATED: PaginatedResponse<InvestorResponseDto> = {
  data: [INVESTOR_DTO],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

// ── listInvestors ──────────────────────────────────────────────────────────

describe('InvestorController.listInvestors', () => {
  it('calls service.findAll with parsed params and returns 200 with data', async () => {
    const service = makeMockService();
    service.findAll.mockResolvedValue(Result.ok(PAGINATED));
    const res = makeRes();

    await new InvestorController(service).listInvestors(
      makeReq({ query: { page: '2', limit: '10' } }),
      res,
      makeNext(),
    );

    expect(service.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
    expect(res.json).toHaveBeenCalledWith(PAGINATED);
  });

  it('uses pagination defaults when query params are omitted', async () => {
    const service = makeMockService();
    service.findAll.mockResolvedValue(Result.ok(PAGINATED));

    await new InvestorController(service).listInvestors(makeReq(), makeRes(), makeNext());

    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('returns the service error status and body when service fails', async () => {
    const service = makeMockService();
    service.findAll.mockResolvedValue(Result.fail(new InfrastructureError('DB down')));
    const res = makeRes();

    await new InvestorController(service).listInvestors(makeReq(), res, makeNext());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'DB down' },
    });
  });

  it('calls next() when Zod throws on invalid query', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new InvestorController(service).listInvestors(
      makeReq({ query: { limit: '999' } }), // limit max is 100
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
  });
});

// ── createInvestor ─────────────────────────────────────────────────────────

describe('InvestorController.createInvestor', () => {
  const VALID_BODY = {
    name: 'Bob Jones',
    email: 'bob@example.com',
    investor_type: 'Individual',
  };

  it('returns 201 with the created investor on success', async () => {
    const service = makeMockService();
    service.create.mockResolvedValue(Result.ok(INVESTOR_DTO));
    const res = makeRes();

    await new InvestorController(service).createInvestor(
      makeReq({ body: VALID_BODY }),
      res,
      makeNext(),
    );

    expect(service.create).toHaveBeenCalledWith(VALID_BODY);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(INVESTOR_DTO);
  });

  it('returns 409 when the service returns DuplicateEmailError', async () => {
    const service = makeMockService();
    service.create.mockResolvedValue(
      Result.fail(new DuplicateEmailError('bob@example.com')),
    );
    const res = makeRes();

    await new InvestorController(service).createInvestor(
      makeReq({ body: VALID_BODY }),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'CONFLICT', message: expect.stringContaining('bob@example.com') },
    });
  });

  it('calls next() when the body fails Zod validation', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new InvestorController(service).createInvestor(
      makeReq({ body: { name: 'Bob', email: 'not-an-email', investor_type: 'Individual' } }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('calls next() when investor_type is not a valid enum value', async () => {
    const service = makeMockService();
    const next = makeNext();

    await new InvestorController(service).createInvestor(
      makeReq({ body: { name: 'Bob', email: 'bob@example.com', investor_type: 'unknown' } }),
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });
});
