import express from 'express';
import { loadPrisma } from './loaders/PrismaLoader.js';
import { loadContainer } from './loaders/ContainerLoader.js';
import { loadExpress } from './loaders/ExpressLoader.js';
import { loadSwagger } from './loaders/SwaggerLoader.js';

// Build the Express app synchronously.
// Swagger and health must be registered before loadExpress(), which appends notFound + errorHandler.
// Tests import this default export and configure the container via loadContainer() separately.
const app = express();
loadSwagger(app);

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Returns API status and uptime. Use to verify the service is running.
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
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

loadExpress(app);

export default app;

// Full async setup used by index.ts (connects Prisma + wires DI container)
export async function createApp() {
  await loadPrisma();
  loadContainer();
  return app;
}
