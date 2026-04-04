import prisma from '@db/PrismaClient.js';

export async function loadPrisma() {
  await prisma.$connect();
}
