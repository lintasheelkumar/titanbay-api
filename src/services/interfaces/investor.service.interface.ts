import { Result } from '../../lib/result.js';
import { DomainError } from '../../errors/domain-errors.js';
import { PaginatedResponse } from '../../lib/pagination.js';
import { InvestorResponseDto } from '../../dtos/investor.dto.js';
import { CreateInvestorInput } from '../../schemas/investor.schema.js';

export interface IInvestorService {
  findAll(params: { page: number; limit: number }): Promise<Result<PaginatedResponse<InvestorResponseDto>, DomainError>>;
  create(data: CreateInvestorInput): Promise<Result<InvestorResponseDto, DomainError>>;
}
