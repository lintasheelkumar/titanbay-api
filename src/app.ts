import express from 'express';
import { loadPrisma } from '@loaders/PrismaLoader.js';
import { loadContainer } from '@loaders/ContainerLoader.js';
import { loadExpress } from '@loaders/ExpressLoader.js';
import { loadSwagger } from '@loaders/SwaggerLoader.js';

// Build the Express app synchronously.
// Tests import this default export and configure the container via loadContainer() separately.
const app = express();
loadSwagger(app);
loadExpress(app);

export default app;

// Full async setup used by index.ts (connects Prisma + wires DI container)
export async function createApp() {
  await loadPrisma();
  loadContainer();
  return app;
}
