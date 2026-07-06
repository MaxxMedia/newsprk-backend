import { prisma } from "./prisma.js";
import { getPlanLabel, getEffectivePlan } from "./packagePricing.js";
import { getActiveRecruitmentPackage } from "./packagePurchases.js";

export const PLAN_JOB_LIMITS = {
  free: 2,
  basic: 20,
  professional: null,
  enterprise: null,
};

export async function getJobPostingEligibility(companyId) {
  if (!companyId) {
    return {
      canPost: false,
      reason: "NO_COMPANY",
      message: "Link a company profile before posting jobs.",
      upgradeRequired: false,
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionPlan: true,
      subscriptionExpiresAt: true,
      jobPostingCredits: true,
    },
  });

  if (!company) {
    return {
      canPost: false,
      reason: "NO_COMPANY",
      message: "Company not found.",
      upgradeRequired: false,
    };
  }

  const plan = getEffectivePlan(company);
  const baseLimit = PLAN_JOB_LIMITS[plan] ?? PLAN_JOB_LIMITS.free;
  const isUnlimited = baseLimit === null;
  const activeRecruitment = await getActiveRecruitmentPackage(companyId, prisma);
  const recruitmentSlots = activeRecruitment ? 1 : 0;

  const totalJobs = await prisma.job.count({
    where: {
      companyId,
      isExternal: false,
    },
  });

  const packageActiveJobs = await prisma.job.count({
    where: {
      companyId,
      isExternal: false,
      isActive: true,
    },
  });

  const effectiveLimit = isUnlimited ? null : baseLimit + recruitmentSlots;
  const remaining = isUnlimited ? null : Math.max(0, effectiveLimit - totalJobs);
  const canPost = isUnlimited || totalJobs < effectiveLimit;

  const planLabel = getPlanLabel(plan);

  return {
    canPost,
    plan,
    planLabel,
    activeJobs: totalJobs,
    packageActiveJobs,
    baseLimit: isUnlimited ? "Unlimited" : baseLimit,
    recruitmentSlots,
    recruitmentExpiresAt: activeRecruitment?.expiresAt ?? null,
    recruitmentPackageName: activeRecruitment?.packageName ?? null,
    effectiveLimit: isUnlimited ? "Unlimited" : effectiveLimit,
    remaining,
    isUnlimited,
    upgradeRequired: !canPost,
    message: canPost
      ? isUnlimited
        ? `You can post unlimited jobs on the ${planLabel} plan.`
        : activeRecruitment
          ? `${remaining} job posting${remaining === 1 ? "" : "s"} remaining (${totalJobs} of ${effectiveLimit} used). Recruitment package active until ${new Date(activeRecruitment.expiresAt).toLocaleDateString("en-IN")}.`
          : `${remaining} job posting${remaining === 1 ? "" : "s"} remaining (${totalJobs} of ${effectiveLimit} used on ${planLabel}).`
      : activeRecruitment
        ? `Your ${planLabel} plan allows ${effectiveLimit} job postings (including recruitment package). You have ${totalJobs} jobs — upgrade or renew to post more.`
        : `Your ${planLabel} plan allows ${effectiveLimit} job posting${effectiveLimit === 1 ? "" : "s"}. You have ${totalJobs} jobs — only the ${effectiveLimit} newest stay active on the feed. Upgrade or buy a monthly recruitment package to post more.`,
  };
}

export async function assertCanPostJob(companyId) {
  const eligibility = await getJobPostingEligibility(companyId);

  if (!eligibility.canPost) {
    const error = new Error(eligibility.message);
    error.status = 403;
    error.code = "JOB_POSTING_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  return eligibility;
}
