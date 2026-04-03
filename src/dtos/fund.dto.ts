import { Fund, FundStatus } from '@prisma/client';

export interface FundResponseDto {
  id: string;
  name: string;
  vintage_year: number;
  target_size_usd: number;
  status: FundStatus;
  created_at: string;
}

export function toFundResponse(fund: Fund): FundResponseDto {
  return {
    id: fund.id,
    name: fund.name,
    vintage_year: fund.vintage_year,
    target_size_usd: fund.target_size_usd.toNumber(),
    status: fund.status,
    created_at: fund.created_at.toISOString(),
  };
}

export function toFundResponseList(funds: Fund[]): FundResponseDto[] {
  return funds.map(toFundResponse);
}
