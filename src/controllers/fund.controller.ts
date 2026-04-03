import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { IFundService } from '../services/interfaces/fund.service.interface.js';
import { createFundSchema, updateFundSchema, fundParamsSchema } from '../schemas/fund.schema.js';
import { paginationSchema } from '../schemas/pagination.schema.js';
import { TOKENS } from '../constants/tokens.js';

@injectable()
export class FundController {
  constructor(@inject(TOKENS.FundService) private readonly service: IFundService) {}

  listFunds = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paginationSchema.parse(req.query);
      const result = await this.service.findAll(params);
      if (result.isErr) return res.status(result.error.statusCode).json({ error: { code: result.error.code, message: result.error.message } });
      return res.json(result.value);
    } catch (err) {
      next(err);
    }
  };

  getFund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = fundParamsSchema.parse(req.params);
      const result = await this.service.findById(id);
      if (result.isErr) return res.status(result.error.statusCode).json({ error: { code: result.error.code, message: result.error.message } });
      return res.json(result.value);
    } catch (err) {
      next(err);
    }
  };

  createFund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createFundSchema.parse(req.body);
      const result = await this.service.create(data);
      if (result.isErr) return res.status(result.error.statusCode).json({ error: { code: result.error.code, message: result.error.message } });
      return res.status(201).json(result.value);
    } catch (err) {
      next(err);
    }
  };

  updateFund = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = updateFundSchema.parse(req.body);
      const result = await this.service.update(data);
      if (result.isErr) return res.status(result.error.statusCode).json({ error: { code: result.error.code, message: result.error.message } });
      return res.json(result.value);
    } catch (err) {
      next(err);
    }
  };
}
