// lib/packagePurchases.js — FULL FILE

import { prisma } from "./prisma.js";
import { getPlanLabel } from "./packagePricing.js";
import { ACTIVE_PURCHASE_STATUSES, getCompanyTrialInfo } from "./trialInfo.js";

// ✅ NEW: explicit tier ranking. This is the single source of truth for
// "which plan wins" when a company has more than one currently-active
// PAID subscription purchase (e.g. bought Basic, later upgraded to
// Professional or Enterprise — the old Basic row is still PAID and
// still unexpired, so it must never be allowed to shadow the newer,
// higher purchase just because of creation-date ordering).
const PLAN_RANK = {
  free: 0,
  basic: 1,
  professional: 2,
  enterprise: 3,
};

function rankOf(planId) {
  return PLAN_RANK[planId] ?? 0;
}

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

export async function getActiveSubscription(companyId, prismaClient = prisma, now = new Date()) {
  if (!companyId) return { plan: "free", expiresAt: null, purchase: null };
  const [purchases, company, trial] = await Promise.all([
    prismaClient.packagePurchase.findMany({
      where: { companyId, packageType: "SUBSCRIPTION", packageId: { not: "free" }, status: { in: ACTIVE_PURCHASE_STATUSES },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: { createdAt: "desc" },
    }),
    prismaClient.company.findUnique({ where: { id: companyId }, select: { subscriptionPlan: true, subscriptionExpiresAt: true } }),
    prismaClient.companyTrial.findUnique({ where: { companyId } }),
  ]);
  // A trial must preserve older paid companies that have no purchase history.
  const baselinePlan = trial ? trial.previousSubscriptionPlan : company?.subscriptionPlan;
  const baselineExpiry = trial ? trial.previousSubscriptionExpiresAt : company?.subscriptionExpiresAt;
  let best = { plan: "free", expiresAt: null, purchase: null };
  if (rankOf(baselinePlan) && (!baselineExpiry || baselineExpiry > now)) {
    best = { plan: baselinePlan, expiresAt: baselineExpiry ?? null, purchase: null };
  }
  for (const purchase of purchases) {
    const purchaseExpiry = purchase.expiresAt ? new Date(purchase.expiresAt).getTime() : Infinity;
    const bestExpiry = best.expiresAt ? new Date(best.expiresAt).getTime() : Infinity;
    const sameTierWins = purchase.packageId === best.plan && (purchaseExpiry > bestExpiry ||
      (purchaseExpiry === bestExpiry && (!best.purchase || (purchase.status === "PAID" && best.purchase.status !== "PAID"))));
    if (rankOf(purchase.packageId) > rankOf(best.plan) || sameTierWins) {
      best = { plan: purchase.packageId, expiresAt: purchase.expiresAt, purchase };
    }
  }
  return best;
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
      status: { in: ACTIVE_PURCHASE_STATUSES },
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
  const trial = await getCompanyTrialInfo(companyId, prismaClient);
  const activePackages = await getActivePackagePurchases(companyId, prismaClient);

  if (activeRecruitment) {
    return {
      trial,
      activePackages,
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
    trial,
    activePackages,
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
export async function getActivePackagePurchases(companyId, prismaClient = prisma, now = new Date()) {
  if (!companyId) return [];
  return prismaClient.packagePurchase.findMany({
    where: {
      companyId,
      status: { in: ACTIVE_PURCHASE_STATUSES },
      packageId: { not: "free" },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
}
