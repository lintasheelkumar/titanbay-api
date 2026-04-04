import { injectable, inject } from 'tsyringe';
import { IInvestmentService } from '@services/interfaces/investment.service.interface.js';
import { IInvestmentRepository } from '@db/repositories/interfaces/investment-repository.interface.js';
import { IFundRepository } from '@db/repositories/interfaces/fund-repository.interface.js';
import { IInvestorRepository } from '@db/repositories/interfaces/investor-repository.interface.js';
import {
  InvestmentResponseDto,
  toInvestmentResponse,
  toInvestmentResponseList,
} from '@dtos/investment.dto.js';
import { buildPaginatedResponse, PaginatedResponse, PaginationParams } from '@lib/pagination.js';
import { Result } from '@lib/result.js';
import {
  DomainError,
  FundNotFoundError,
  InvestorNotFoundError,
  InfrastructureError,
} from '@errors/domain-errors.js';
import { TOKENS } from '@constants/tokens.js';
import { CreateInvestmentInput } from '@schemas/investment.schema.js';

@injectable()
export class InvestmentService implements IInvestmentService {
  constructor(
    @inject(TOKENS.InvestmentRepo) private readonly investmentRepo: IInvestmentRepository,
    @inject(TOKENS.FundRepo) private readonly fundRepo: IFundRepository,
    @inject(TOKENS.InvestorRepo) private readonly investorRepo: IInvestorRepository,
  ) {}

  async findByFund(
    fundId: string,
    params: PaginationParams,
  ): Promise<Result<PaginatedResponse<InvestmentResponseDto>, DomainError>> {
    const fundExists = await this.fundRepo.exists(fundId);
    if (!fundExists) return Result.fail(new FundNotFoundError(fundId));

    try {
      const { data, total } = await this.investmentRepo.findByFund(fundId, params);
      return Result.ok(buildPaginatedResponse(toInvestmentResponseList(data), total, params));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to fetch investments', err as Error));
    }
  }

  async create(
    fundId: string,
    data: CreateInvestmentInput,
  ): Promise<Result<InvestmentResponseDto, DomainError>> {
    const [fundExists, investor] = await Promise.all([
      this.fundRepo.exists(fundId),
      this.investorRepo.findById(data.investor_id),
    ]);

    if (!fundExists) return Result.fail(new FundNotFoundError(fundId));
    if (!investor) return Result.fail(new InvestorNotFoundError(data.investor_id));

    try {
      const investment = await this.investmentRepo.create(fundId, data);
      return Result.ok(toInvestmentResponse(investment));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to create investment', err as Error));
    }
  }
}
