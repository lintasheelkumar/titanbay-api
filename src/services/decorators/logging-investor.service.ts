import { InvestorResponseDto } from "../../api/dtos/investor.dto";
import { CreateInvestorInput } from "../../api/schemas/investor.schema";
import { LOG_MESSAGES } from "../../constants";
import { ILogger } from "../../lib/logger";
import { PaginatedResponse, PaginationParams } from "../../lib/pagination";
import { Result } from "../../lib/result";
import { IInvestorService } from "../interfaces/investor.service.interface";


export class LoggingInvestorService implements IInvestorService {
  constructor(
    private readonly investorService: IInvestorService,
    private readonly logger: ILogger,
  ) {}

  async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<InvestorResponseDto>>> {
    const result = await this.investorService.findAll(params);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.INVESTOR_LIST_FETCHED, { count: result.value.data.length });
    } else {
      this.logger.error(LOG_MESSAGES.INVESTOR_LIST_FAILED, { error: result.error.message });
    }
    return result;
  }

  async create(data: CreateInvestorInput): Promise<Result<InvestorResponseDto>> {
    const result = await this.investorService.create(data);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.INVESTOR_CREATED, { id: result.value.id });
    } else {
      this.logger.error(LOG_MESSAGES.INVESTOR_CREATE_FAILED, { error: result.error.message });
    }
    return result;
  }
}
