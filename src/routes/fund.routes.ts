import { Router } from 'express';
import { container } from '../container.js';
import { FundController } from '../controllers/fund.controller.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { createFundSchema, updateFundSchema, fundParamsSchema } from '../schemas/fund.schema.js';

export function createFundRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /funds:
   *   get:
   *     tags: [Funds]
   *     summary: List all funds
   *     description: Returns a paginated list of all funds, ordered by creation date (newest first).
   *     parameters:
   *       - $ref: '#/components/parameters/PageParam'
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         description: Paginated list of funds
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Fund'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationMeta'
   */
  // Lazy resolution: container.resolve() runs on first request, after configureContainer()
  router.get('/', (req, res, next) => container.resolve(FundController).listFunds(req, res, next));

  /**
   * @openapi
   * /funds/{id}:
   *   get:
   *     tags: [Funds]
   *     summary: Get a specific fund
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Fund ID
   *     responses:
   *       200:
   *         description: Fund details
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Fund'
   *       404:
   *         description: Fund not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get('/:id', validateParams(fundParamsSchema), (req, res, next) => container.resolve(FundController).getFund(req, res, next));

  /**
   * @openapi
   * /funds:
   *   post:
   *     tags: [Funds]
   *     summary: Create a new fund
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateFundRequest'
   *     responses:
   *       201:
   *         description: Fund created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Fund'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post('/', validateBody(createFundSchema), (req, res, next) => container.resolve(FundController).createFund(req, res, next));

  /**
   * @openapi
   * /funds:
   *   put:
   *     tags: [Funds]
   *     summary: Update an existing fund
   *     description: Full replacement update. The fund ID is provided in the request body.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateFundRequest'
   *     responses:
   *       200:
   *         description: Fund updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Fund'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Fund not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.put('/', validateBody(updateFundSchema), (req, res, next) => container.resolve(FundController).updateFund(req, res, next));

  return router;
}
