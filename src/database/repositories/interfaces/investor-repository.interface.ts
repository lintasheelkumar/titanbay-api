import { Investor } from '@prisma/client';
import { PaginationParams } from '../../../lib/pagination.js';
import { CreateInvestorInput } from '../../../api/schemas/investor.schema.js';

export interface IInvestorRepository {
  findAll(params: PaginationParams): Promise<{ data: Investor[]; total: number }>;
  findById(id: string): Promise<Investor | null>;
  findByEmail(email: string): Promise<Investor | null>;
  create(data: CreateInvestorInput): Promise<Investor>;
}
