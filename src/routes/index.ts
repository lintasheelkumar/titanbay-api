import { Router } from 'express';
import { createFundRouter } from './fund.routes.js';
import { createInvestorRouter } from './investor.routes.js';
import { createInvestmentRouter } from './investment.routes.js';

export function createRouter(): Router {
  const router = Router();

  router.use('/funds', createFundRouter());
  router.use('/investors', createInvestorRouter());
  router.use('/funds/:fund_id/investments', createInvestmentRouter());

  return router;
}
