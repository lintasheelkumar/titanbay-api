import { PrismaClient, FundStatus } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { IFundRepository } from './interfaces/IFundRepository.js';
import { PaginationParams } from '../../lib/pagination.js';
import { CreateFundInput, UpdateFundInput } from '../../api/schemas/fund.schema.js';
import { TOKENS } from '../../constants/tokens.js';

@injectable()
export class PrismaFundRepository implements IFundRepository {
  constructor(@inject(TOKENS.PrismaClient) private readonly prisma: PrismaClient) {}

  async findAll(params: PaginationParams) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fund.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
      this.prisma.fund.count(),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.fund.findUnique({ where: { id } });
  }

  async exists(id: string) {
    const count = await this.prisma.fund.count({ where: { id } });
    return count > 0;
  }

  async create(data: CreateFundInput) {
    return this.prisma.fund.create({
      data: {
        name: data.name,
        vintage_year: data.vintage_year,
        target_size_usd: data.target_size_usd,
        status: data.status as FundStatus | undefined,
      },
    });
  }

  async update(id: string, data: Omit<UpdateFundInput, 'id'>) {
    return this.prisma.fund.update({
      where: { id },
      data: {
        name: data.name,
        vintage_year: data.vintage_year,
        target_size_usd: data.target_size_usd,
        status: data.status as FundStatus,
      },
    });
  }
}
