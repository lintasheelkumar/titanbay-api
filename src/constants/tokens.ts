export const TOKENS = {
  // Infrastructure
  PrismaClient: Symbol.for('PrismaClient'),
  CacheService: Symbol.for('ICacheService'),
  Logger: Symbol.for('ILogger'),

  // Repositories
  FundRepo: Symbol.for('IFundRepository'),
  InvestorRepo: Symbol.for('IInvestorRepository'),
  InvestmentRepo: Symbol.for('IInvestmentRepository'),

  // Services — core (unwrapped) and decorated (what controllers use)
  FundServiceCore: Symbol.for('FundServiceCore'),
  FundService: Symbol.for('IFundService'),
  InvestorServiceCore: Symbol.for('InvestorServiceCore'),
  InvestorService: Symbol.for('IInvestorService'),
  InvestmentServiceCore: Symbol.for('InvestmentServiceCore'),
  InvestmentService: Symbol.for('IInvestmentService'),
} as const;
