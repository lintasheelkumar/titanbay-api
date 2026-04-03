import { Result } from '../../lib/result.js';
import { DomainError } from '../../errors/domain-errors.js';
import { PaginatedResponse } from '../../lib/pagination.js';
import { FundResponseDto } from '../../dtos/fund.dto.js';
import { CreateFundInput, UpdateFundInput } from '../../schemas/fund.schema.js';

export interface IFundService {
  findAll(params: { page: number; limit: number }): Promise<Result<PaginatedResponse<FundResponseDto>, DomainError>>;
  findById(id: string): Promise<Result<FundResponseDto, DomainError>>;
  create(data: CreateFundInput): Promise<Result<FundResponseDto, DomainError>>;
  update(data: UpdateFundInput): Promise<Result<FundResponseDto, DomainError>>;
}
