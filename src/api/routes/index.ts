import { Router } from 'express';
import { container } from '@loaders/ContainerLoader.js';
import { FundController } from '@controllers/fund.controller.js';
import { createFundRouter } from './fund.routes.js';
import { createInvestorRouter } from './investor.routes.js';
import { createInvestmentRouter } from './investment.routes.js';
import { createHealthRouter } from './health.routes.js';

export function createRouter(): Router {
  const router = Router();

  router.use('/health', createHealthRouter());
  router.get('/funds', (req, res, next) => container.resolve(FundController).listFunds(req, res, next));
  router.use('/fund', createFundRouter());
  router.use('/investors', createInvestorRouter());
  router.use('/fund/:fund_id/investments', createInvestmentRouter());

  return router;
}
