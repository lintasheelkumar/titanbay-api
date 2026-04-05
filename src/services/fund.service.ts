import { injectable, inject } from 'tsyringe';
import { IFundService } from '@services/interfaces/fund.service.interface.js';
import { IFundRepository } from '@db/repositories/interfaces/fund-repository.interface.js';
import { FundResponseDto, toFundResponse, toFundResponseList } from '@dtos/fund.dto.js';
import { buildPaginatedResponse, PaginatedResponse, PaginationParams } from '@lib/pagination.js';
import { Result } from '@lib/result.js';
import {
  DomainError,
  FundNotFoundError,
  ValidationError,
  InfrastructureError,
} from '@errors/domain-errors.js';
import { TOKENS } from '@constants/tokens.js';
import { CreateFundInput, UpdateFundInput } from '@schemas/fund.schema.js';

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2002'
  );
}

@injectable()
export class FundService implements IFundService {
  constructor(@inject(TOKENS.FundRepo) private readonly fundRepo: IFundRepository) {}

  async findAll(
    params: PaginationParams,
  ): Promise<Result<PaginatedResponse<FundResponseDto>, DomainError>> {
    try {
      const { data, total } = await this.fundRepo.findAll(params);
      return Result.ok(buildPaginatedResponse(toFundResponseList(data), total, params));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to fetch funds', err as Error));
    }
  }

  async findById(id: string): Promise<Result<FundResponseDto, DomainError>> {
    try {
      const fund = await this.fundRepo.findById(id);
      if (!fund) return Result.fail(new FundNotFoundError(id));
      return Result.ok(toFundResponse(fund));
    } catch (err) {
      return Result.fail(new InfrastructureError('Failed to fetch fund', err as Error));
    }
  }

  async create(data: CreateFundInput): Promise<Result<FundResponseDto, DomainError>> {
    try {
      const fund = await this.fundRepo.create(data);
      return Result.ok(toFundResponse(fund));
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        return Result.fail(new ValidationError('A fund with this name and vintage year already exists'));
      }
      return Result.fail(new InfrastructureError('Failed to create fund', err as Error));
    }
  }

  async update(data: UpdateFundInput): Promise<Result<FundResponseDto, DomainError>> {
    const { id, ...updateData } = data;

    const exists = await this.fundRepo.exists(id);
    if (!exists) return Result.fail(new FundNotFoundError(id));

    try {
      const fund = await this.fundRepo.update(id, updateData);
      return Result.ok(toFundResponse(fund));
    } catch (err) {
      if (isPrismaUniqueViolation(err)) {
        return Result.fail(new ValidationError('A fund with this name and vintage year already exists'));
      }
      return Result.fail(new InfrastructureError('Failed to update fund', err as Error));
    }
  }
}
