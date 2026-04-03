import { Investment } from '@prisma/client';
import { PaginationParams } from '../../lib/pagination.js';
import { CreateInvestmentInput } from '../../schemas/investment.schema.js';

export interface IInvestmentRepository {
  findByFund(
    fundId: string,
    params: PaginationParams,
  ): Promise<{ data: Investment[]; total: number }>;
  create(fundId: string, data: CreateInvestmentInput): Promise<Investment>;
}
