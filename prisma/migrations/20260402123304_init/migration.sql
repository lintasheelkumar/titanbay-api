-- CreateEnum
CREATE TYPE "FundStatus" AS ENUM ('Fundraising', 'Investing', 'Closed');

-- CreateEnum
CREATE TYPE "InvestorType" AS ENUM ('Individual', 'Institution', 'Family Office');

-- CreateTable
CREATE TABLE "funds" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "vintage_year" INTEGER NOT NULL,
    "target_size_usd" DECIMAL(18,2) NOT NULL,
    "status" "FundStatus" NOT NULL DEFAULT 'Fundraising',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investors" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "investor_type" "InvestorType" NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" UUID NOT NULL,
    "investor_id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "amount_usd" DECIMAL(18,2) NOT NULL,
    "investment_date" DATE NOT NULL,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "investors_email_key" ON "investors"("email");

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_investor_id_fkey" FOREIGN KEY ("investor_id") REFERENCES "investors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
