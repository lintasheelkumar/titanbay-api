import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { container } from '@loaders/ContainerLoader.js';
import { TOKENS } from '@constants/tokens.js';

export function createHealthRouter(): Router {
  const router = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [System]
   *     summary: Health check
   *     description: Returns API status and uptime. Performs a lightweight database connectivity check. Returns 503 if the database is unreachable.
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 uptime:
   *                   type: number
   *                   example: 1234.56
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       503:
   *         description: Service is unhealthy — database unreachable
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: Database unreachable
   */
  router.get('/', async (_req, res) => {
    const prismaClient = container.resolve<PrismaClient>(TOKENS.PrismaClient);
    try {
      await prismaClient.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'error', error: 'Database unreachable' });
    }
  });

  return router;
}
