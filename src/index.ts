import 'reflect-metadata'; // Must be first — required by tsyringe
import 'dotenv/config';
import { configureContainer } from './container.js';
import app from './app.js';
import prisma from './lib/prisma.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function start() {
  configureContainer();
  await prisma.$connect();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
