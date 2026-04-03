import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { IInvestorService } from '../../services/interfaces/investor.service.interface.js';
import { createInvestorSchema } from '../schemas/investor.schema.js';
import { paginationSchema } from '../schemas/pagination.schema.js';
import { TOKENS } from '../../constants/tokens.js';

@injectable()
export class InvestorController {
  constructor(@inject(TOKENS.InvestorService) private readonly service: IInvestorService) {}

  listInvestors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paginationSchema.parse(req.query);
      const result = await this.service.findAll(params);
      if (result.isErr) return res.status(result.error.statusCode).json({ error: { code: result.error.code, message: result.error.message } });
      return res.json(result.value);
    } catch (err) {
      next(err);
    }
  };

  createInvestor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = createInvestorSchema.parse(req.body);
      const result = await this.service.create(data);
      if (result.isErr) return res.status(result.error.statusCode).json({ error: { code: result.error.code, message: result.error.message } });
      return res.status(201).json(result.value);
    } catch (err) {
      next(err);
    }
  };
}
