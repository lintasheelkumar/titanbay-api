import { z } from 'zod';

export const createInvestmentSchema = z.object({
  investor_id: z.string().uuid({ message: 'investor_id must be a valid UUID' }),
  amount_usd: z.number().positive(),
  investment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'investment_date must be in YYYY-MM-DD format'),
});

export const fundInvestmentsParamsSchema = z.object({
  fund_id: z.string().uuid({ message: 'fund_id must be a valid UUID' }),
});

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
