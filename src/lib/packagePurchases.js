import { prisma } from "./prisma.js";
import { getPlanLabel, getEffectivePlan } from "./packagePricing.js";

export function dedupeCompanyPurchases(purchases) {
  let seenFree = false;

  return purchases.filter((purchase) => {
    if (purchase.packageType === "SUBSCRIPTION" && purchase.packageId === "free") {
      if (seenFree) return false;
      seenFree = true;
    }
    return true;
  });
}

export async function getActiveRecruitmentPackage(companyId, prismaClient = prisma) {
  if (!companyId) return null;

  return prismaClient.packagePurchase.findFirst({
    where: {
      companyId,
      packageType: "RECRUITMENT",
      status: "PAID",
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: "desc" },
    select: {
      id: true,
      packageId: true,
      packageName: true,
      expiresAt: true,
      startsAt: true,
      createdAt: true,
    },
  });
}

export async function buildSubscriptionDisplay(company, companyId, prismaClient = prisma) {
  const plan = getEffectivePlan(company);
  const planLabel = getPlanLabel(plan);
  const activeRecruitment = await getActiveRecruitmentPackage(companyId, prismaClient);

  if (activeRecruitment) {
    return {
      plan,
      planLabel,
      displayPlan: activeRecruitment.packageId,
      displayPlanLabel: activeRecruitment.packageName,
      recruitmentExpiresAt: activeRecruitment.expiresAt,
      expiresAt: company.subscriptionExpiresAt ?? null,
      jobPostingCredits: company.jobPostingCredits ?? 0,
      basePlanLabel: planLabel,
    };
  }

  return {
    plan,
    planLabel,
    displayPlan: plan,
    displayPlanLabel: planLabel,
    recruitmentExpiresAt: null,
    expiresAt: company.subscriptionExpiresAt ?? null,
    jobPostingCredits: company.jobPostingCredits ?? 0,
    basePlanLabel: planLabel,
  };
}
