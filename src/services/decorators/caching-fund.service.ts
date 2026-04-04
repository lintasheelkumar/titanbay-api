import { FundResponseDto } from "@dtos/fund.dto.js";
import { CreateFundInput, UpdateFundInput } from "@schemas/fund.schema.js";
import { CACHE_TTL_SECONDS, CACHE_TTL_SINGLE, CacheKeys } from "@constants/index.js";
import { ICacheService } from "@lib/cache.js";
import { ILogger } from "@lib/logger.js";
import { PaginatedResponse, PaginationParams } from "@lib/pagination.js";
import { Result } from "@lib/result.js";
import { IFundService } from "@services/interfaces/fund.service.interface.js";


export class CachingFundService implements IFundService {
  constructor(
    private readonly fundService: IFundService,
    private readonly cache: ICacheService,
    private readonly logger: ILogger,
  ) {}

  async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<FundResponseDto>>> {
    const key = CacheKeys.FUNDS_LIST(params.page, params.limit);
    try {
      const cached = this.cache.get<PaginatedResponse<FundResponseDto>>(key);
      if (cached && Array.isArray(cached.data)) return Result.ok(cached);
    } catch (err) {
      this.logger.debug('Cache read error — falling through to inner service', { key, err });
    }

    const result = await this.fundService.findAll(params);
    if (result.isOk) this.cache.set(key, result.value, CACHE_TTL_SECONDS);
    return result;
  }

  async findById(id: string): Promise<Result<FundResponseDto>> {
    const key = CacheKeys.FUND_BY_ID(id);
    try {
      const cached = this.cache.get<FundResponseDto>(key);
      if (cached?.id) return Result.ok(cached);
    } catch (err) {
      this.logger.debug('Cache read error — falling through to inner service', { key, err });
    }

    const result = await this.fundService.findById(id);
    if (result.isOk) this.cache.set(key, result.value, CACHE_TTL_SINGLE);
    return result;
  }

  async create(data: CreateFundInput): Promise<Result<FundResponseDto>> {
    const result = await this.fundService.create(data);
    if (result.isOk) {
      this.cache.set(CacheKeys.FUND_BY_ID(result.value.id), result.value, CACHE_TTL_SINGLE);
      this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
    }
    return result;
  }

  async update(data: UpdateFundInput): Promise<Result<FundResponseDto>> {
    const result = await this.fundService.update(data);
    if (result.isOk) {
      this.cache.set(CacheKeys.FUND_BY_ID(data.id), result.value, CACHE_TTL_SINGLE);
      this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
    }
    return result;
  }
}
