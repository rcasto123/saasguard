-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "appId" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'manager';

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_resolvedAt_idx" ON "Alert"("resolvedAt");

-- CreateIndex
CREATE INDEX "Alert_severity_idx" ON "Alert"("severity");

-- CreateIndex
CREATE INDEX "App_status_idx" ON "App"("status");

-- CreateIndex
CREATE INDEX "App_riskScore_idx" ON "App"("riskScore");

-- CreateIndex
CREATE INDEX "AppUser_userId_idx" ON "AppUser"("userId");

-- CreateIndex
CREATE INDEX "AppUser_isActive_idx" ON "AppUser"("isActive");

-- CreateIndex
CREATE INDEX "SpendRecord_appId_period_idx" ON "SpendRecord"("appId", "period");

-- CreateIndex
CREATE INDEX "SpendRecord_employeeId_idx" ON "SpendRecord"("employeeId");

-- CreateIndex
CREATE INDEX "SpendRecord_period_idx" ON "SpendRecord"("period");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
