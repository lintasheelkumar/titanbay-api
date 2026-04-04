import { z } from 'zod';

const currentYear = new Date().getFullYear();

export const createFundSchema = z.object({
  name: z.string().min(1).max(255),
  vintage_year: z.number().int().min(1900).max(currentYear + 5),
  target_size_usd: z.number().positive(),
  status: z.enum(['Fundraising', 'Investing', 'Closed']).optional(),
});

export const updateFundBodySchema = z.object({
  name: z.string().min(1).max(255),
  vintage_year: z.number().int().min(1900).max(currentYear + 5),
  target_size_usd: z.number().positive(),
  status: z.enum(['Fundraising', 'Investing', 'Closed']),
});

export const updateFundSchema = updateFundBodySchema.extend({
  id: z.string().uuid(),
});

export const fundParamsSchema = z.object({
  id: z.string().uuid({ message: 'id must be a valid UUID' }),
});

export type CreateFundInput = z.infer<typeof createFundSchema>;
export type UpdateFundInput = z.infer<typeof updateFundSchema>;
