import { IInvestorService } from '../interfaces/investor.service.interface.js';
import { ICacheService } from '../../lib/cache.js';
import { InvestorResponseDto } from '../../dtos/investor.dto.js';
import { PaginatedResponse, PaginationParams } from '../../lib/pagination.js';
import { Result } from '../../lib/result.js';
import { CacheKeys } from '../../constants/cache.js';
import { CreateInvestorInput } from '../../schemas/investor.schema.js';

export class CachingInvestorService implements IInvestorService {
  constructor(
    private readonly inner: IInvestorService,
    private readonly cache: ICacheService,
  ) {}

  async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<InvestorResponseDto>>> {
    const key = CacheKeys.INVESTORS_LIST(params.page, params.limit);
    try {
      const cached = this.cache.get<PaginatedResponse<InvestorResponseDto>>(key);
      if (cached && Array.isArray(cached.data)) return Result.ok(cached);
    } catch { /* fall through */ }

    const result = await this.inner.findAll(params);
    if (result.isOk) this.cache.set(key, result.value);
    return result;
  }

  async create(data: CreateInvestorInput): Promise<Result<InvestorResponseDto>> {
    const result = await this.inner.create(data);
    if (result.isOk) this.cache.invalidateByPrefix(CacheKeys.INVESTORS_LIST_PREFIX);
    return result;
  }
}
