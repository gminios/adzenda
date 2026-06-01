/*
  Warnings:

  - Made the column `tenantId` on table `BenchmarkThreshold` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "BenchmarkThreshold" DROP CONSTRAINT "BenchmarkThreshold_tenantId_fkey";

-- AlterTable
ALTER TABLE "BenchmarkThreshold" ALTER COLUMN "tenantId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "BenchmarkThreshold" ADD CONSTRAINT "BenchmarkThreshold_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
