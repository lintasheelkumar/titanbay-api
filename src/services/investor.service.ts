import { injectable, inject } from 'tsyringe';
import { IInvestorService } from './interfaces/investor.service.interface.js';
import { IInvestorRepository } from '../repositories/interfaces/investor.repository.interface.js';
import { InvestorResponseDto, toInvestorResponse, toInvestorResponseList } from '../dtos/investor.dto.js';
import { buildPaginatedResponse, PaginatedResponse, PaginationParams } from '../lib/pagination.js';
import { Result } from '../lib/result.js';
import {
  DomainError,
  DuplicateEmailError,
  InfrastructureError,
} from '../errors/domain-errors.js';
import { TOKENS } from '../constants/tokens.js';
import { CreateInvestorInput } from '../schemas/investor.schema.js';

@injectable()
export class InvestorService implements IInvestorService {
  constructor(@inject(TOKENS.InvestorRepo) private readonly investorRepo: IInvestorRepository) {}

  async findAll(
    params: PaginationParams,
  ): Promise<Result<PaginatedResponse<InvestorResponseDto>, DomainError>> {
    try {
      const { data, total } = await this.investorRepo.findAll(params);
      return Result.ok(buildPaginatedResponse(toInvestorResponseList(data), total, params));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to fetch investors', err as Error));
    }
  }

  async create(data: CreateInvestorInput): Promise<Result<InvestorResponseDto, DomainError>> {
    const existing = await this.investorRepo.findByEmail(data.email);
    if (existing) return Result.fail(new DuplicateEmailError(data.email));

    try {
      const investor = await this.investorRepo.create(data);
      return Result.ok(toInvestorResponse(investor));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to create investor', err as Error));
    }
  }
}
