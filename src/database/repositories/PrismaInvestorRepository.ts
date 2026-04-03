import { PrismaClient, InvestorType } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { IInvestorRepository } from './interfaces/IInvestorRepository.js';
import { PaginationParams } from '../../lib/pagination.js';
import { CreateInvestorInput } from '../../api/schemas/investor.schema.js';
import { TOKENS } from '../../constants/tokens.js';

const INVESTOR_TYPE_MAP: Record<string, InvestorType> = {
  Individual: InvestorType.Individual,
  Institution: InvestorType.Institution,
  'Family Office': InvestorType.Family_Office,
};

@injectable()
export class PrismaInvestorRepository implements IInvestorRepository {
  constructor(@inject(TOKENS.PrismaClient) private readonly prisma: PrismaClient) {}

  async findAll(params: PaginationParams) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.investor.findMany({ skip, take: limit, orderBy: { created_at: 'desc' } }),
      this.prisma.investor.count(),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.investor.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.investor.findUnique({ where: { email } });
  }

  async create(data: CreateInvestorInput) {
    return this.prisma.investor.create({
      data: {
        name: data.name,
        investor_type: INVESTOR_TYPE_MAP[data.investor_type],
        email: data.email,
      },
    });
  }
}
