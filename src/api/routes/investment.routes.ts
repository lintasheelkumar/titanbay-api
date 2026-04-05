import { Router } from 'express';
import { container } from '@loaders/ContainerLoader.js';
import { InvestmentController } from '@controllers/investment.controller.js';
import { validateBody, validateParams } from '@middlewares/validate.js';
import { createInvestmentSchema, fundInvestmentsParamsSchema } from '@schemas/investment.schema.js';

export function createInvestmentRouter(): Router {
  const router = Router({ mergeParams: true });

  /**
   * @openapi
   * /fund/{fund_id}/investments:
   *   get:
   *     tags: [Investments]
   *     summary: List all investments for a fund
   *     description: Returns a paginated list of all investments made into a specific fund.
   *     parameters:
   *       - in: path
   *         name: fund_id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Fund ID
   *       - $ref: '#/components/parameters/PageParam'
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         description: Paginated list of investments
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Investment'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationMeta'
   *       404:
   *         description: Fund not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get('/', validateParams(fundInvestmentsParamsSchema), (req, res, next) => container.resolve(InvestmentController).listInvestments(req, res, next));

  /**
   * @openapi
   * /fund/{fund_id}/investments:
   *   post:
   *     tags: [Investments]
   *     summary: Create a new investment
   *     description: Create a new investment into a specific fund. Both the fund and investor must exist.
   *     parameters:
   *       - in: path
   *         name: fund_id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Fund ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateInvestmentRequest'
   *     responses:
   *       201:
   *         description: Investment created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Investment'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Fund or investor not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post('/', validateParams(fundInvestmentsParamsSchema), validateBody(createInvestmentSchema), (req, res, next) => container.resolve(InvestmentController).createInvestment(req, res, next));

  return router;
}
