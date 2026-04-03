import { Investment } from '@prisma/client';

export interface InvestmentResponseDto {
  id: string;
  fund_id: string;
  investor_id: string;
  amount_usd: number;
  investment_date: string;
}

export function toInvestmentResponse(investment: Investment): InvestmentResponseDto {
  return {
    id: investment.id,
    fund_id: investment.fund_id,
    investor_id: investment.investor_id,
    amount_usd: investment.amount_usd.toNumber(),
    investment_date: investment.investment_date.toISOString().split('T')[0],
  };
}

export function toInvestmentResponseList(investments: Investment[]): InvestmentResponseDto[] {
  return investments.map(toInvestmentResponse);
}
