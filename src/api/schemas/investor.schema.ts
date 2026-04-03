import { z } from 'zod';

export const createInvestorSchema = z.object({
  name: z.string().min(1).max(255),
  investor_type: z.enum(['Individual', 'Institution', 'Family Office']),
  email: z.string().email(),
});

export type CreateInvestorInput = z.infer<typeof createInvestorSchema>;
