import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';

import { TOKENS } from '../constants/tokens.js';

// Infrastructure
import prisma from '../database/PrismaClient.js';
import { NodeCacheService, ICacheService } from '../lib/cache.js';
import { PinoLogger, ILogger } from '../lib/logger.js';

// Repositories
import { PrismaFundRepository } from '../database/repositories/prisma-fund-repository.js';
import { PrismaInvestorRepository } from '../database/repositories/prisma-investor-repository.js';
import { PrismaInvestmentRepository } from '../database/repositories/prisma-investment-repository.js';

// Core services
import { FundService } from '../services/fund.service.js';
import { InvestorService } from '../services/investor.service.js';
import { InvestmentService } from '../services/investment.service.js';

// Decorators
import { CachingFundService } from '../services/decorators/caching-fund.service.js';
import { LoggingFundService } from '../services/decorators/logging-fund.service.js';
import { CachingInvestorService } from '../services/decorators/caching-investor.service.js';
import { LoggingInvestorService } from '../services/decorators/logging-investor.service.js';
import { CachingInvestmentService } from '../services/decorators/caching-investment.service.js';
import { LoggingInvestmentService } from '../services/decorators/logging-investment.service.js';

// Controllers
import { FundController } from '../api/controllers/fund.controller.js';
import { InvestorController } from '../api/controllers/investor.controller.js';
import { InvestmentController } from '../api/controllers/investment.controller.js';

import { IFundService } from '../services/interfaces/fund.service.interface.js';
import { IInvestorService } from '../services/interfaces/investor.service.interface.js';
import { IInvestmentService } from '../services/interfaces/investment.service.interface.js';

export function loadContainer() {
  // ── Infrastructure ──────────────────────────────────────────────────────────
  container.registerInstance<PrismaClient>(TOKENS.PrismaClient, prisma);
  container.registerSingleton<ICacheService>(TOKENS.CacheService, NodeCacheService);
  container.registerSingleton<ILogger>(TOKENS.Logger, PinoLogger);

  // ── Repositories ────────────────────────────────────────────────────────────
  container.registerSingleton(TOKENS.FundRepo, PrismaFundRepository);
  container.registerSingleton(TOKENS.InvestorRepo, PrismaInvestorRepository);
  container.registerSingleton(TOKENS.InvestmentRepo, PrismaInvestmentRepository);

  // ── Core services (pure business logic) ─────────────────────────────────────
  container.registerSingleton(TOKENS.FundServiceCore, FundService);
  container.registerSingleton(TOKENS.InvestorServiceCore, InvestorService);
  container.registerSingleton(TOKENS.InvestmentServiceCore, InvestmentService);

  // ── Decorated services (what controllers receive) ────────────────────────────
  // Pattern: Controller → Caching → Logging → Core
  container.register<IFundService>(TOKENS.FundService, {
    useFactory: (c) => {
      const core = c.resolve<IFundService>(TOKENS.FundServiceCore);
      const cache = c.resolve<ICacheService>(TOKENS.CacheService);
      const logger = c.resolve<ILogger>(TOKENS.Logger);
      return new CachingFundService(new LoggingFundService(core, logger), cache, logger);
    },
  });

  container.register<IInvestorService>(TOKENS.InvestorService, {
    useFactory: (c) => {
      const core = c.resolve<IInvestorService>(TOKENS.InvestorServiceCore);
      const cache = c.resolve<ICacheService>(TOKENS.CacheService);
      const logger = c.resolve<ILogger>(TOKENS.Logger);
      return new CachingInvestorService(new LoggingInvestorService(core, logger), cache, logger);
    },
  });

  container.register<IInvestmentService>(TOKENS.InvestmentService, {
    useFactory: (c) => {
      const core = c.resolve<IInvestmentService>(TOKENS.InvestmentServiceCore);
      const cache = c.resolve<ICacheService>(TOKENS.CacheService);
      const logger = c.resolve<ILogger>(TOKENS.Logger);
      return new CachingInvestmentService(new LoggingInvestmentService(core, logger), cache, logger);
    },
  });

  // ── Controllers ─────────────────────────────────────────────────────────────
  container.registerSingleton(FundController);
  container.registerSingleton(InvestorController);
  container.registerSingleton(InvestmentController);
}

export { container };
