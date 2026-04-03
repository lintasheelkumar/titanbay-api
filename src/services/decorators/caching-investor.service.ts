import { InvestorResponseDto } from "../../api/dtos/investor.dto";
import { CreateInvestorInput } from "../../api/schemas/investor.schema";
import { CacheKeys } from "../../constants";
import { ICacheService } from "../../lib/cache";
import { PaginatedResponse, PaginationParams } from "../../lib/pagination";
import { Result } from "../../lib/result";
import { IInvestorService } from "../interfaces/investor.service.interface";


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
