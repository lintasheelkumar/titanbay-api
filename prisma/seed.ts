import { PrismaClient, FundStatus, InvestorType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.investment.deleteMany();
  await prisma.fund.deleteMany();
  await prisma.investor.deleteMany();

  const fund1 = await prisma.fund.create({
    data: {
      name: 'Titanbay Growth Fund I',
      vintage_year: 2022,
      target_size_usd: 250000000,
      status: FundStatus.Investing,
    },
  });

  const fund2 = await prisma.fund.create({
    data: {
      name: 'Titanbay Venture Fund II',
      vintage_year: 2024,
      target_size_usd: 100000000,
      status: FundStatus.Fundraising,
    },
  });

  const investor1 = await prisma.investor.create({
    data: {
      name: 'Alice Pemberton',
      investor_type: InvestorType.Individual,
      email: 'alice@example.com',
    },
  });

  const investor2 = await prisma.investor.create({
    data: {
      name: 'Blackstone Capital Ltd',
      investor_type: InvestorType.Institution,
      email: 'invest@blackstone-example.com',
    },
  });

  const investor3 = await prisma.investor.create({
    data: {
      name: 'Hartwell Family Office',
      investor_type: InvestorType.Family_Office,
      email: 'office@hartwell-example.com',
    },
  });

  await prisma.investment.createMany({
    data: [
      {
        fund_id: fund1.id,
        investor_id: investor1.id,
        amount_usd: 5000000,
        investment_date: new Date('2022-06-15'),
      },
      {
        fund_id: fund1.id,
        investor_id: investor2.id,
        amount_usd: 50000000,
        investment_date: new Date('2022-07-01'),
      },
      {
        fund_id: fund2.id,
        investor_id: investor3.id,
        amount_usd: 10000000,
        investment_date: new Date('2024-03-15'),
      },
    ],
  });

  console.log('Seed complete');
  console.log(`  Funds: ${fund1.name}, ${fund2.name}`);
  console.log(`  Investors: ${investor1.name}, ${investor2.name}, ${investor3.name}`);
  console.log(`  Investments: 3`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
