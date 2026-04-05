import { InvestmentResponseDto } from "@dtos/investment.dto.js";
import { CreateInvestmentInput } from "@schemas/investment.schema.js";
import { CACHE_TTL_SECONDS, CacheKeys } from "@constants/index.js";
import { ICacheService } from "@lib/cache.js";
import { ILogger } from "@lib/logger.js";
import { PaginatedResponse, PaginationParams } from "@lib/pagination.js";
import { Result } from "@lib/result.js";
import { IInvestmentService } from "@services/interfaces/investment.service.interface.js";


export class CachingInvestmentService implements IInvestmentService {
  constructor(
    private readonly investmentService: IInvestmentService,
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
      if (cached && Array.isArray(cached.data)){
        this.logger.info("Reading investments data from cache");
        return Result.ok(cached);
      }
    } catch (err) {
      this.logger.warn('Cache read error — falling through to inner service', { key, err });
    }

    this.logger.info("Calling investment service for fetching investments from db")
    const result = await this.investmentService.findByFund(fundId, params);
    if (result.isOk) this.cache.set(key, result.value, CACHE_TTL_SECONDS);
    return result;
  }

  async create(fundId: string, data: CreateInvestmentInput): Promise<Result<InvestmentResponseDto>> {
    this.logger.info("Calling investment service to create investment")
    const result = await this.investmentService.create(fundId, data);
    if (result.isOk) {
      this.cache.invalidateByPrefix(`${CacheKeys.INVESTMENTS_BY_FUND_PREFIX}:${fundId}`);
      this.logger.warn("Investments cache invalidated after create", { fundId });
    }
    return result;
  }
}
