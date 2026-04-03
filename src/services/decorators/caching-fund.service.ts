import { IFundService } from '../interfaces/fund.service.interface.js';
import { ICacheService } from '../../lib/cache.js';
import { FundResponseDto } from '../../dtos/fund.dto.js';
import { PaginatedResponse, PaginationParams } from '../../lib/pagination.js';
import { Result } from '../../lib/result.js';
import { CacheKeys, CACHE_TTL_SINGLE } from '../../constants/cache.js';
import { CreateFundInput, UpdateFundInput } from '../../schemas/fund.schema.js';

export class CachingFundService implements IFundService {
  constructor(
    private readonly inner: IFundService,
    private readonly cache: ICacheService,
  ) {}

  async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<FundResponseDto>>> {
    const key = CacheKeys.FUNDS_LIST(params.page, params.limit);
    try {
      const cached = this.cache.get<PaginatedResponse<FundResponseDto>>(key);
      if (cached && Array.isArray(cached.data)) return Result.ok(cached);
    } catch { /* fall through to inner */ }

    const result = await this.inner.findAll(params);
    if (result.isOk) this.cache.set(key, result.value);
    return result;
  }

  async findById(id: string): Promise<Result<FundResponseDto>> {
    const key = CacheKeys.FUND_BY_ID(id);
    try {
      const cached = this.cache.get<FundResponseDto>(key);
      if (cached?.id) return Result.ok(cached);
    } catch { /* fall through */ }

    const result = await this.inner.findById(id);
    if (result.isOk) this.cache.set(key, result.value, CACHE_TTL_SINGLE);
    return result;
  }

  async create(data: CreateFundInput): Promise<Result<FundResponseDto>> {
    const result = await this.inner.create(data);
    if (result.isOk) {
      this.cache.set(CacheKeys.FUND_BY_ID(result.value.id), result.value, CACHE_TTL_SINGLE);
      this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
    }
    return result;
  }

  async update(data: UpdateFundInput): Promise<Result<FundResponseDto>> {
    const result = await this.inner.update(data);
    if (result.isOk) {
      this.cache.set(CacheKeys.FUND_BY_ID(data.id), result.value, CACHE_TTL_SINGLE);
      this.cache.invalidateByPrefix(CacheKeys.FUNDS_LIST_PREFIX);
    }
    return result;
  }
}
