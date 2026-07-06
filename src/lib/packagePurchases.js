import { prisma } from "./prisma.js";
import { getPlanLabel } from "./packagePricing.js";

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

export async function getActiveSubscription(companyId, prismaClient = prisma) {
  if (!companyId) {
    return { plan: "free", expiresAt: null, purchase: null };
  }

  const paidSubscription = await prismaClient.packagePurchase.findFirst({
    where: {
      companyId,
      packageType: "SUBSCRIPTION",
      packageId: { not: "free" },
      status: "PAID",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (paidSubscription) {
    return {
      plan: paidSubscription.packageId,
      expiresAt: paidSubscription.expiresAt,
      purchase: paidSubscription,
    };
  }

  const company = await prismaClient.company.findUnique({
    where: { id: companyId },
    select: { subscriptionPlan: true, subscriptionExpiresAt: true },
  });

  let plan = company?.subscriptionPlan || "free";
  let expiresAt = company?.subscriptionExpiresAt ?? null;

  if (
    plan !== "free" &&
    expiresAt &&
    new Date(expiresAt) < new Date()
  ) {
    plan = "free";
    expiresAt = null;
  }

  return { plan, expiresAt, purchase: null };
}

export async function syncCompanySubscription(companyId, prismaClient = prisma) {
  if (!companyId) return null;

  const active = await getActiveSubscription(companyId, prismaClient);

  await prismaClient.company.update({
    where: { id: companyId },
    data: {
      subscriptionPlan: active.plan,
      subscriptionExpiresAt: active.expiresAt,
    },
  });

  return active;
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
  const activeSubscription = await getActiveSubscription(companyId, prismaClient);
  const plan = activeSubscription.plan;
  const planLabel = getPlanLabel(plan);
  const activeRecruitment = await getActiveRecruitmentPackage(companyId, prismaClient);

  if (activeRecruitment) {
    return {
      plan,
      planLabel,
      displayPlan: activeRecruitment.packageId,
      displayPlanLabel: activeRecruitment.packageName,
      recruitmentExpiresAt: activeRecruitment.expiresAt,
      expiresAt: activeSubscription.expiresAt,
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
    expiresAt: activeSubscription.expiresAt,
    jobPostingCredits: company.jobPostingCredits ?? 0,
    basePlanLabel: planLabel,
  };
}
