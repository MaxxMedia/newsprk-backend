-- Preserve existing purchases and company content. No rows are deleted.
ALTER TYPE "PackagePurchase_status" ADD VALUE IF NOT EXISTS 'TRIAL';

CREATE TABLE "CompanyTrial" (
    "companyId" INTEGER NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "convertedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    CONSTRAINT "CompanyTrial_pkey" PRIMARY KEY ("companyId")
);

CREATE UNIQUE INDEX "CompanyTrial_purchaseId_key" ON "CompanyTrial"("purchaseId");
CREATE INDEX "CompanyTrial_expiresAt_idx" ON "CompanyTrial"("expiresAt");
ALTER TABLE "CompanyTrial" ADD CONSTRAINT "CompanyTrial_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CompanyTrial" ADD CONSTRAINT "CompanyTrial_purchaseId_fkey"
    FOREIGN KEY ("purchaseId") REFERENCES "PackagePurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CompanyTrial" ADD COLUMN "previousSubscriptionPlan" TEXT NOT NULL DEFAULT 'free', ADD COLUMN "previousSubscriptionExpiresAt" TIMESTAMP(3);
ALTER TABLE "Post" ADD COLUMN "packagePurchaseId" INTEGER;
ALTER TABLE "AdvertisementBanner" ADD COLUMN "packagePurchaseId" INTEGER;
ALTER TABLE "Post" ADD CONSTRAINT "Post_packagePurchaseId_fkey" FOREIGN KEY ("packagePurchaseId") REFERENCES "PackagePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdvertisementBanner" ADD CONSTRAINT "AdvertisementBanner_packagePurchaseId_fkey" FOREIGN KEY ("packagePurchaseId") REFERENCES "PackagePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Job" ADD COLUMN "hiddenByPlan" BOOLEAN NOT NULL DEFAULT false;
