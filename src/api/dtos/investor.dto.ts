import { Investor, InvestorType } from '@prisma/client';

const INVESTOR_TYPE_DISPLAY: Record<InvestorType, string> = {
  [InvestorType.Individual]: 'Individual',
  [InvestorType.Institution]: 'Institution',
  [InvestorType.Family_Office]: 'Family Office',
};

export interface InvestorResponseDto {
  id: string;
  name: string;
  investor_type: string;
  email: string;
  created_at: string;
}

export function toInvestorResponse(investor: Investor): InvestorResponseDto {
  return {
    id: investor.id,
    name: investor.name,
    investor_type: INVESTOR_TYPE_DISPLAY[investor.investor_type],
    email: investor.email,
    created_at: investor.created_at.toISOString(),
  };
}

export function toInvestorResponseList(investors: Investor[]): InvestorResponseDto[] {
  return investors.map(toInvestorResponse);
}
