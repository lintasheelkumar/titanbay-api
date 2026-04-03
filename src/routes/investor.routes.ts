import { Router } from 'express';
import { container } from '../container.js';
import { InvestorController } from '../controllers/investor.controller.js';
import { validateBody } from '../middleware/validate.js';
import { createInvestorSchema } from '../schemas/investor.schema.js';

export function createInvestorRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /investors:
   *   get:
   *     tags: [Investors]
   *     summary: List all investors
   *     description: Returns a paginated list of all investors, ordered by creation date (newest first).
   *     parameters:
   *       - $ref: '#/components/parameters/PageParam'
   *       - $ref: '#/components/parameters/LimitParam'
   *     responses:
   *       200:
   *         description: Paginated list of investors
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Investor'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationMeta'
   */
  router.get('/', (req, res, next) => container.resolve(InvestorController).listInvestors(req, res, next));

  /**
   * @openapi
   * /investors:
   *   post:
   *     tags: [Investors]
   *     summary: Create a new investor
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateInvestorRequest'
   *     responses:
   *       201:
   *         description: Investor created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Investor'
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       409:
   *         description: Email already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post('/', validateBody(createInvestorSchema), (req, res, next) => container.resolve(InvestorController).createInvestor(req, res, next));

  return router;
}
