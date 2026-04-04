import { FundResponseDto } from "../../api/dtos/fund.dto";
import { CreateFundInput, UpdateFundInput } from "../../api/schemas/fund.schema";
import { LOG_MESSAGES } from "../../constants";
import { ILogger } from "../../lib/logger";
import { PaginatedResponse, PaginationParams } from "../../lib/pagination";
import { Result } from "../../lib/result";
import { IFundService } from "../interfaces/fund.service.interface";

const SLOW_QUERY_MS = 200;

export class LoggingFundService implements IFundService {
  constructor(
    private readonly fundService: IFundService,
    private readonly logger: ILogger,
  ) {}

  async findAll(params: PaginationParams): Promise<Result<PaginatedResponse<FundResponseDto>>> {
    const start = Date.now();
    const result = await this.fundService.findAll(params);
    const duration = Date.now() - start;

    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.FUND_LIST_FETCHED, {
        page: params.page,
        count: result.value.data.length,
        total: result.value.total,
        duration: `${duration}ms`,
      });
    } else {
      this.logger.error(LOG_MESSAGES.FUND_LIST_FAILED, { params, error: result.error.message, duration: `${duration}ms` });
    }

    if (duration > SLOW_QUERY_MS) {
      this.logger.warn(LOG_MESSAGES.SLOW_QUERY_DETECTED, { operation: 'fund.findAll', duration: `${duration}ms` });
    }

    return result;
  }

  async findById(id: string): Promise<Result<FundResponseDto>> {
    const result = await this.fundService.findById(id);
    if (result.isErr) this.logger.debug(LOG_MESSAGES.FUND_NOT_FOUND, { id });
    return result;
  }

  async create(data: CreateFundInput): Promise<Result<FundResponseDto>> {
    const result = await this.fundService.create(data);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.FUND_CREATED, { id: result.value.id });
    } else {
      this.logger.error(LOG_MESSAGES.FUND_CREATE_FAILED, { error: result.error.message });
    }
    return result;
  }

  async update(data: UpdateFundInput): Promise<Result<FundResponseDto>> {
    const result = await this.fundService.update(data);
    if (result.isOk) {
      this.logger.info(LOG_MESSAGES.FUND_UPDATED, { id: data.id });
    } else {
      this.logger.error(LOG_MESSAGES.FUND_UPDATE_FAILED, { id: data.id, error: result.error.message });
    }
    return result;
  }
}
