import { IInvestmentService } from '../services/interfaces/investment.service.interface.js';
import { ILogger } from '../lib/logger.js';
import { InvestmentResponseDto } from '../api/dtos/investment.dto.js';
import { PaginatedResponse, PaginationParams } from '../lib/pagination.js';
import { Result } from '../lib/result.js';
import { LOG_MESSAGES } from '../constants/log-messages.js';
import { CreateInvestmentInput } from '../api/schemas/investment.schema.js';

export class LoggingInvestmentService implements IInvestmentService {
  constructor(
    private readonly inner: IInvestmentService,
    private readonly logger: ILogger,
  ) {}

  async findByFund(
    fundId: string,
    params: PaginationParams,
  ): Promise<Result<PaginatedResponse<InvestmentResponseDto>>> {
    const result = await this.inner.findByFund(fundId, params);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.INVESTMENT_LIST_FETCHED, { fundId, count: result.value.data.length });
    } else {
      this.logger.error(LOG_MESSAGES.INVESTMENT_LIST_FAILED, { fundId, error: result.error.message });
    }
    return result;
  }

  async create(fundId: string, data: CreateInvestmentInput): Promise<Result<InvestmentResponseDto>> {
    const result = await this.inner.create(fundId, data);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.INVESTMENT_CREATED, { id: result.value.id, fundId });
    } else {
      this.logger.error(LOG_MESSAGES.INVESTMENT_CREATE_FAILED, { fundId, error: result.error.message });
    }
    return result;
  }
}
