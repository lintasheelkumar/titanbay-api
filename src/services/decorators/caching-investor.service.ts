import { InvestorResponseDto } from "@dtos/investor.dto.js";
import { CreateInvestorInput } from "@schemas/investor.schema.js";
import { CACHE_TTL_SECONDS, CacheKeys } from "@constants/index.js";
import { ICacheService } from "@lib/cache.js";
import { ILogger } from "@lib/logger.js";
import { PaginatedResponse, PaginationParams } from "@lib/pagination.js";
import { Result } from "@lib/result.js";
import { IInvestorService } from "@services/interfaces/investor.service.interface.js";


export class CachingInvestorService implements IInvestorService {
  constructor(
    private readonly investorService: IInvestorService,
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {}

  async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<InvestorResponseDto>>> {
    const key = CacheKeys.INVESTORS_LIST(params.page, params.limit);
    try {
      const cached = this.cache.get<PaginatedResponse<InvestorResponseDto>>(key);
      if (cached && Array.isArray(cached.data)) return Result.ok(cached);
    } catch (err) {
      this.logger.debug('Cache read error — falling through to inner service', { key, err });
    }

    const result = await this.investorService.findAll(params);
    if (result.isOk) this.cache.set(key, result.value, CACHE_TTL_SECONDS);
    return result;
  }

  async create(data: CreateInvestorInput): Promise<Result<InvestorResponseDto>> {
    const result = await this.investorService.create(data);
    if (result.isOk) this.cache.invalidateByPrefix(CacheKeys.INVESTORS_LIST_PREFIX);
    return result;
  }
}
