import { InvestmentResponseDto } from "@dtos/investment.dto.js";
import { CreateInvestmentInput } from "@schemas/investment.schema.js";
import { LOG_MESSAGES } from "@constants/index.js";
import { ILogger } from "@lib/logger.js";
import { PaginatedResponse, PaginationParams } from "@lib/pagination.js";
import { Result } from "@lib/result.js";
import { IInvestmentService } from "@services/interfaces/investment.service.interface.js";

export class LoggingInvestmentService implements IInvestmentService {
  constructor(
    private readonly investmentService: IInvestmentService,
    private readonly logger: ILogger,
  ) {}

  async findByFund(
    fundId: string,
    params: PaginationParams,
  ): Promise<Result<PaginatedResponse<InvestmentResponseDto>>> {
    const result = await this.investmentService.findByFund(fundId, params);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.INVESTMENT_LIST_FETCHED, { fundId, count: result.value.data.length });
    } else {
      this.logger.error(LOG_MESSAGES.INVESTMENT_LIST_FAILED, { fundId, error: result.error.message });
    }
    return result;
  }

  async create(fundId: string, data: CreateInvestmentInput): Promise<Result<InvestmentResponseDto>> {
    const result = await this.investmentService.create(fundId, data);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.INVESTMENT_CREATED, { id: result.value.id, fundId });
    } else {
      this.logger.error(LOG_MESSAGES.INVESTMENT_CREATE_FAILED, { fundId, error: result.error.message });
    }
    return result;
  }
}
