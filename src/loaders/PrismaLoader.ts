import prisma from '../database/PrismaClient.js';

export async function loadPrisma() {
  await prisma.$connect();
}
