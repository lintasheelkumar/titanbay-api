import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { IInvestmentService } from '../services/interfaces/investment.service.interface.js';
import { createInvestmentSchema, fundInvestmentsParamsSchema } from '../schemas/investment.schema.js';
import { paginationSchema } from '../schemas/pagination.schema.js';
import { TOKENS } from '../constants/tokens.js';

@injectable()
export class InvestmentController {
  constructor(@inject(TOKENS.InvestmentService) private readonly service: IInvestmentService) {}

  listInvestments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fund_id } = fundInvestmentsParamsSchema.parse(req.params);
      const params = paginationSchema.parse(req.query);
      const result = await this.service.findByFund(fund_id, params);
      if (result.isErr) return res.status(result.error.statusCode).json({ error: { code: result.error.code, message: result.error.message } });
      return res.json(result.value);
    } catch (err) {
      next(err);
    }
  };

  createInvestment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fund_id } = fundInvestmentsParamsSchema.parse(req.params);
      const data = createInvestmentSchema.parse(req.body);
      const result = await this.service.create(fund_id, data);
      if (result.isErr) return res.status(result.error.statusCode).json({ error: { code: result.error.code, message: result.error.message } });
      return res.status(201).json(result.value);
    } catch (err) {
      next(err);
    }
  };
}
