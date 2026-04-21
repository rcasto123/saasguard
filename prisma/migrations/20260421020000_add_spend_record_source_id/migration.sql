-- AlterTable
ALTER TABLE "SpendRecord" ADD COLUMN "sourceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SpendRecord_source_sourceId_key" ON "SpendRecord"("source", "sourceId") WHERE "sourceId" IS NOT NULL;
