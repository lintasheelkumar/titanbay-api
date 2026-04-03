import { Result } from '../../lib/result.js';
import { DomainError } from '../../errors/domain-errors.js';
import { PaginatedResponse } from '../../lib/pagination.js';
import { InvestmentResponseDto } from '../../dtos/investment.dto.js';
import { CreateInvestmentInput } from '../../schemas/investment.schema.js';

export interface IInvestmentService {
  findByFund(fundId: string, params: { page: number; limit: number }): Promise<Result<PaginatedResponse<InvestmentResponseDto>, DomainError>>;
  create(fundId: string, data: CreateInvestmentInput): Promise<Result<InvestmentResponseDto, DomainError>>;
}
