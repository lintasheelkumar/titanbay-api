import { InvestmentResponseDto } from "../../api/dtos/investment.dto";
import { CreateInvestmentInput } from "../../api/schemas/investment.schema";
import { CACHE_TTL_SECONDS, CacheKeys } from "../../constants";
import { ICacheService } from "../../lib/cache";
import { ILogger } from "../../lib/logger";
import { PaginatedResponse, PaginationParams } from "../../lib/pagination";
import { Result } from "../../lib/result";
import { IInvestmentService } from "../interfaces/investment.service.interface";


export class CachingInvestmentService implements IInvestmentService {
  constructor(
    private readonly inner: IInvestmentService,
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {}

  async findByFund(
    fundId: string,
    params: PaginationParams,
  ): Promise<Result<PaginatedResponse<InvestmentResponseDto>>> {
    const key = CacheKeys.INVESTMENTS_BY_FUND(fundId, params.page, params.limit);
    try {
      const cached = this.cache.get<PaginatedResponse<InvestmentResponseDto>>(key);
      if (cached && Array.isArray(cached.data)) return Result.ok(cached);
    } catch (err) {
      this.logger.debug('Cache read error — falling through to inner service', { key, err });
    }

    const result = await this.inner.findByFund(fundId, params);
    if (result.isOk) this.cache.set(key, result.value, CACHE_TTL_SECONDS);
    return result;
  }

  async create(fundId: string, data: CreateInvestmentInput): Promise<Result<InvestmentResponseDto>> {
    const result = await this.inner.create(fundId, data);
    if (result.isOk) this.cache.invalidateByPrefix(`${CacheKeys.INVESTMENTS_BY_FUND_PREFIX}:${fundId}`);
    return result;
  }
}
