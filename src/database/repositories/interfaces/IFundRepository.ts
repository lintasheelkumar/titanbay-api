import { Fund } from '@prisma/client';
import { PaginationParams } from '../../../lib/pagination.js';
import { CreateFundInput, UpdateFundInput } from '../../../api/schemas/fund.schema.js';

export interface IFundRepository {
  findAll(params: PaginationParams): Promise<{ data: Fund[]; total: number }>;
  findById(id: string): Promise<Fund | null>;
  exists(id: string): Promise<boolean>;
  create(data: CreateFundInput): Promise<Fund>;
  update(id: string, data: Omit<UpdateFundInput, 'id'>): Promise<Fund>;
}
