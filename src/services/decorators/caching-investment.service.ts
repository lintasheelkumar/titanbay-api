import { IInvestmentService } from '../services/interfaces/investment.service.interface.js';
import { ICacheService } from '../lib/cache.js';
import { InvestmentResponseDto } from '../api/dtos/investment.dto.js';
import { PaginatedResponse, PaginationParams } from '../lib/pagination.js';
import { Result } from '../lib/result.js';
import { CacheKeys } from '../constants/cache.js';
import { CreateInvestmentInput } from '../api/schemas/investment.schema.js';

export class CachingInvestmentService implements IInvestmentService {
  constructor(
    private readonly inner: IInvestmentService,
    private readonly cache: ICacheService,
  ) {}

  async findByFund(
    fundId: string,
    params: PaginationParams,
  ): Promise<Result<PaginatedResponse<InvestmentResponseDto>>> {
    const key = CacheKeys.INVESTMENTS_BY_FUND(fundId, params.page, params.limit);
    try {
      const cached = this.cache.get<PaginatedResponse<InvestmentResponseDto>>(key);
      if (cached && Array.isArray(cached.data)) return Result.ok(cached);
    } catch { /* fall through */ }

    const result = await this.inner.findByFund(fundId, params);
    if (result.isOk) this.cache.set(key, result.value);
    return result;
  }

  async create(fundId: string, data: CreateInvestmentInput): Promise<Result<InvestmentResponseDto>> {
    const result = await this.inner.create(fundId, data);
    if (result.isOk) this.cache.invalidateByPrefix(CacheKeys.INVESTMENTS_BY_FUND_PREFIX);
    return result;
  }
}
