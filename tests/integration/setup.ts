import { PrismaClient } from '@prisma/client';
import { configureContainer } from '../../src/container';

// Configure DI container once for all tests
configureContainer();

export const prisma = new PrismaClient();

export async function resetDb() {
  await prisma.investment.deleteMany();
  await prisma.fund.deleteMany();
  await prisma.investor.deleteMany();
}
