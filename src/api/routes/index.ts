import { Router } from 'express';
import { container } from '@loaders/ContainerLoader.js';
import { FundController } from '@controllers/funds.controller.js';
import { createFundRouter } from './funds.routes.js';
import { createInvestorRouter } from './investor.routes.js';
import { createInvestmentRouter } from './investment.routes.js';
import { createHealthRouter } from './health.routes.js';

export function createRouter(): Router {
  const router = Router();

  router.use('/health', createHealthRouter());
  router.get('/fundss', (req, res, next) => container.resolve(FundController).listFunds(req, res, next));
  router.use('/funds', createFundRouter());
  router.use('/investors', createInvestorRouter());
  router.use('/funds/:fund_id/investments', createInvestmentRouter());

  return router;
}
