import { prisma } from "./prisma.js";

export const TRIAL_DAYS = 30;
export const ACTIVE_PURCHASE_STATUSES = ["PAID", "TRIAL"];

export async function getCompanyTrialInfo(companyId, prismaClient = prisma, now = new Date()) {
  const trial = companyId
    ? await prismaClient.companyTrial.findUnique({
        where: { companyId },
        include: { Purchase: true },
      })
    : null;
  if (!trial) return { eligible: true, status: "ELIGIBLE", days: TRIAL_DAYS };
  const status = trial.convertedAt
    ? "CONVERTED"
    : trial.expiredAt || trial.expiresAt <= now
      ? "EXPIRED"
      : "ACTIVE";
  return {
    eligible: false,
    status,
    days: TRIAL_DAYS,
    startsAt: trial.startsAt,
    expiresAt: trial.expiresAt,
    daysRemaining: status === "ACTIVE"
      ? Math.ceil((trial.expiresAt.getTime() - now.getTime()) / 86400000)
      : 0,
    packageType: trial.Purchase.packageType,
    packageId: trial.Purchase.packageId,
    packageName: trial.Purchase.packageName,
    purchaseId: trial.purchaseId,
  };
}
