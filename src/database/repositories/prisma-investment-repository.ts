import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { IInvestmentRepository } from './interfaces/investment-repository.interface.js';
import { PaginationParams } from '../../lib/pagination.js';
import { CreateInvestmentInput } from '../../api/schemas/investment.schema.js';
import { TOKENS } from '../../constants/tokens.js';

@injectable()
export class PrismaInvestmentRepository implements IInvestmentRepository {
  constructor(@inject(TOKENS.PrismaClient) private readonly prisma: PrismaClient) {}

  async findByFund(fundId: string, params: PaginationParams) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.investment.findMany({
        where: { fund_id: fundId },
        skip,
        take: limit,
        orderBy: { investment_date: 'desc' },
      }),
      this.prisma.investment.count({ where: { fund_id: fundId } }),
    ]);

    return { data, total };
  }

  async create(fundId: string, data: CreateInvestmentInput) {
    return this.prisma.investment.create({
      data: {
        fund_id: fundId,
        investor_id: data.investor_id,
        amount_usd: data.amount_usd,
        investment_date: new Date(data.investment_date),
      },
    });
  }
}
