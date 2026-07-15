import { prisma } from "./prisma.js";
import { getPlanLabel } from "./packagePricing.js";
import { getActiveSubscription } from "./packagePurchases.js";

export const PLAN_RFQ_LEAD_LIMITS = {
  free: 0,
  basic: 10,
  professional: 20,
  enterprise: null,
};

function getMonthStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getPlanLimit(plan) {
  return Object.prototype.hasOwnProperty.call(PLAN_RFQ_LEAD_LIMITS, plan)
    ? PLAN_RFQ_LEAD_LIMITS[plan]
    : PLAN_RFQ_LEAD_LIMITS.free;
}

export async function getRfqLeadsEligibility(companyId, recruiterUserId = null, prismaClient = prisma) {
  const activeSubscription = await getActiveSubscription(companyId, prismaClient);
  const plan = activeSubscription.plan || "free";
  const planLabel = getPlanLabel(plan);
  const baseLimit = getPlanLimit(plan);
  const isUnlimited = baseLimit === null;

  const supplierWhere = companyId
    ? { companyId }
    : recruiterUserId
      ? { submittedById: recruiterUserId }
      : null;

  const supplierIds = supplierWhere
    ? (
        await prismaClient.supplierDirectory.findMany({
          where: supplierWhere,
          select: { id: true },
        })
      ).map((supplier) => supplier.id)
    : [];

  const usedThisMonth = supplierIds.length
    ? await prismaClient.lead.count({
        where: {
          supplierId: { in: supplierIds },
          createdAt: { gte: getMonthStart() },
        },
      })
    : 0;

  const remaining = isUnlimited ? null : Math.max(0, baseLimit - usedThisMonth);
  const canView = baseLimit !== 0;

  return {
    canView,
    plan,
    planLabel,
    supplierIds,
    effectiveLimit: isUnlimited ? "Unlimited" : baseLimit,
    remaining,
    isUnlimited,
    usedThisMonth,
    upgradeRequired: !canView,
    periodLabel: "this month",
    reason: canView ? null : "PLAN_DOES_NOT_INCLUDE_RFQ_LEADS",
    message: !canView
      ? `RFQ leads are not included on the ${planLabel} plan. Upgrade to Basic or higher to receive leads.`
      : isUnlimited
        ? `Unlimited RFQ leads on the ${planLabel} plan.`
        : `${remaining} of ${baseLimit} leads remaining this month on ${planLabel}.`,
  };
}

export async function getRfqLeadsEligibilityForSupplier(supplierId, prismaClient = prisma) {
  const directory = await prismaClient.supplierDirectory.findUnique({
    where: { id: supplierId },
    select: { id: true, companyId: true },
  });

  if (!directory) {
    return {
      canReceive: false,
      reason: "SUPPLIER_NOT_FOUND",
      message: "Supplier not found.",
      upgradeRequired: false,
    };
  }

  const activeSubscription = directory.companyId
    ? await getActiveSubscription(directory.companyId, prismaClient)
    : { plan: "free" };

  const plan = activeSubscription.plan || "free";
  const planLabel = getPlanLabel(plan);
  const baseLimit = getPlanLimit(plan);
  const isUnlimited = baseLimit === null;

  const usedThisMonth = await prismaClient.lead.count({
    where: {
      supplierId: directory.id,
      createdAt: { gte: getMonthStart() },
    },
  });

  if (baseLimit === 0) {
    return {
      canReceive: false,
      plan,
      planLabel,
      effectiveLimit: 0,
      remaining: 0,
      isUnlimited: false,
      usedThisMonth,
      upgradeRequired: true,
      periodLabel: "this month",
      reason: "PLAN_DOES_NOT_INCLUDE_RFQ_LEADS",
      message: `RFQ leads are not included on the ${planLabel} plan. Upgrade to Basic or higher to receive leads.`,
    };
  }

  const remaining = isUnlimited ? null : Math.max(0, baseLimit - usedThisMonth);
  const canReceive = isUnlimited || remaining > 0;

  return {
    canReceive,
    plan,
    planLabel,
    effectiveLimit: isUnlimited ? "Unlimited" : baseLimit,
    remaining,
    isUnlimited,
    usedThisMonth,
    upgradeRequired: !canReceive,
    periodLabel: "this month",
    reason: canReceive ? null : "MONTHLY_LIMIT_REACHED",
    message: !canReceive
      ? `This supplier has reached its monthly RFQ lead limit on the ${planLabel} plan.`
      : isUnlimited
        ? `Unlimited RFQ leads on the ${planLabel} plan.`
        : `${remaining} of ${baseLimit} leads remaining this month on ${planLabel}.`,
  };
}
