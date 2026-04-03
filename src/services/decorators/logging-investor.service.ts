import { IInvestorService } from '../interfaces/investor.service.interface.js';
import { ILogger } from '../../lib/logger.js';
import { InvestorResponseDto } from '../../dtos/investor.dto.js';
import { PaginatedResponse, PaginationParams } from '../../lib/pagination.js';
import { Result } from '../../lib/result.js';
import { LOG_MESSAGES } from '../../constants/log-messages.js';
import { CreateInvestorInput } from '../../schemas/investor.schema.js';

export class LoggingInvestorService implements IInvestorService {
  constructor(
    private readonly inner: IInvestorService,
    private readonly logger: ILogger,
  ) {}

  async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<InvestorResponseDto>>> {
    const result = await this.inner.findAll(params);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.INVESTOR_LIST_FETCHED, { count: result.value.data.length });
    } else {
      this.logger.error(LOG_MESSAGES.INVESTOR_LIST_FAILED, { error: result.error.message });
    }
    return result;
  }

  async create(data: CreateInvestorInput): Promise<Result<InvestorResponseDto>> {
    const result = await this.inner.create(data);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.INVESTOR_CREATED, { id: result.value.id });
    } else {
      this.logger.error(LOG_MESSAGES.INVESTOR_CREATE_FAILED, { error: result.error.message });
    }
    return result;
  }
}
