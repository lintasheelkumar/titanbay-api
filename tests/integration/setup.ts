import { PrismaClient } from '@prisma/client';
import { loadContainer } from '../../src/loaders/ContainerLoader';

// Configure DI container once for all tests
loadContainer();

export const prisma = new PrismaClient();

export async function resetDb() {
  await prisma.investment.deleteMany();
  await prisma.fund.deleteMany();
  await prisma.investor.deleteMany();
}
