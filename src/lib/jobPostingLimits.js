// lib/jobPostingLimits.js

import { prisma } from "./prisma.js";
import { getPlanLabel } from "./packagePricing.js";
import { getActiveRecruitmentPackage, getActiveSubscription } from "./packagePurchases.js";

export const PLAN_JOB_LIMITS = {
  free: 2,
  basic: 20,
  professional: null, // unlimited
  enterprise: null, // unlimited
};

// 🔹 Internship Listings quota — separate pool from regular Job Postings.
// Free plan does not include internship listings at all (0 = not available).
export const PLAN_INTERNSHIP_LIMITS = {
  free: 0,
  basic: 10,
  professional: null, // unlimited
  enterprise: null, // unlimited
};

const INTERNSHIP_TYPE = "Internship";

// ✅ Helper: Check if value is unlimited
function isUnlimited(value) {
  return value === null || value === "Unlimited" || value === Infinity;
}

// ✅ Helper: Get display value for limits
function getDisplayValue(value) {
  if (isUnlimited(value)) return "Unlimited";
  return value;
}

/**
 * Shared eligibility calculator for both job postings and internship listings.
 * `postType` is either "job" or "internship" and controls which quota table,
 * which jobs get counted (employmentType filter), and the wording used.
 */
async function computeEligibility(companyId, postType) {
  const isInternship = postType === "internship";
  const limitsTable = isInternship ? PLAN_INTERNSHIP_LIMITS : PLAN_JOB_LIMITS;
  const noun = isInternship ? "internship listing" : "job posting";

  if (!companyId) {
    return {
      canPost: false,
      reason: "NO_COMPANY",
      message: "Link a company profile before posting jobs.",
      upgradeRequired: false,
      remaining: 0,
      effectiveLimit: 0,
      activeJobs: 0,
      isUnlimited: false,
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
      remaining: 0,
      effectiveLimit: 0,
      activeJobs: 0,
      isUnlimited: false,
    };
  }

  const activeSubscription = await getActiveSubscription(companyId, prisma);
  const plan = activeSubscription.plan;

  // ✅ FIX: Use explicit lookup - this is the key fix!
  const baseLimit = plan in limitsTable ? limitsTable[plan] : limitsTable.free;
  const isUnlimitedLimit = isUnlimited(baseLimit);

  // Internship listings don't currently receive bonus slots from recruitment
  // packages (only job postings do), matching the packages table.
  const activeRecruitment = isInternship ? null : await getActiveRecruitmentPackage(companyId, prisma);
  const recruitmentSlots = activeRecruitment ? 1 : 0;

  const employmentTypeFilter = isInternship
    ? { employmentType: INTERNSHIP_TYPE }
    : { employmentType: { not: INTERNSHIP_TYPE } };

  const totalJobs = await prisma.job.count({
    where: {
      companyId,
      isExternal: false,
      ...employmentTypeFilter,
    },
  });

  const packageActiveJobs = await prisma.job.count({
    where: {
      companyId,
      isExternal: false,
      isActive: true,
      ...employmentTypeFilter,
    },
  });

  // Free plan explicitly disallows internships (limit = 0), not just "runs out".
  if (isInternship && baseLimit === 0) {
    const planLabel = getPlanLabel(plan);
    return {
      canPost: false,
      plan,
      planLabel,
      activeJobs: totalJobs,
      packageActiveJobs,
      baseLimit: 0,
      recruitmentSlots: 0,
      effectiveLimit: 0,
      remaining: 0,
      isUnlimited: false,
      upgradeRequired: true,
      reason: "PLAN_DOES_NOT_INCLUDE_INTERNSHIPS",
      message: `Internship listings are not included on the ${planLabel} plan. Upgrade to Basic or higher to post internships.`,
    };
  }

  // ✅ FIX: Calculate effective limit properly
  let effectiveLimit;
  let remaining;
  let canPost;

  if (isUnlimitedLimit) {
    // ✅ For Professional and Enterprise: unlimited
    effectiveLimit = "Unlimited";
    remaining = "Unlimited";
    canPost = true;
  } else {
    // ✅ For Free and Basic: limited
    effectiveLimit = baseLimit + recruitmentSlots;
    remaining = Math.max(0, effectiveLimit - totalJobs);
    canPost = totalJobs < effectiveLimit;
  }

  const planLabel = getPlanLabel(plan);

  return {
    canPost,
    plan,
    planLabel,
    activeJobs: totalJobs,
    packageActiveJobs,
    baseLimit: isUnlimitedLimit ? "Unlimited" : baseLimit,
    recruitmentSlots,
    recruitmentExpiresAt: activeRecruitment?.expiresAt ?? null,
    recruitmentPackageName: activeRecruitment?.packageName ?? null,
    effectiveLimit,
    remaining,
    isUnlimited: isUnlimitedLimit,
    upgradeRequired: !canPost,
    message: canPost
      ? isUnlimitedLimit
        ? `You can post unlimited ${noun}s on the ${planLabel} plan.`
        : activeRecruitment
          ? `${remaining} ${noun}${remaining === 1 ? "" : "s"} remaining (${totalJobs} of ${effectiveLimit} used). Recruitment package active until ${new Date(activeRecruitment.expiresAt).toLocaleDateString("en-IN")}.`
          : `${remaining} ${noun}${remaining === 1 ? "" : "s"} remaining (${totalJobs} of ${effectiveLimit} used on ${planLabel}).`
      : activeRecruitment
        ? `Your ${planLabel} plan allows ${effectiveLimit} ${noun}s (including recruitment package). You have ${totalJobs} — upgrade or renew to post more.`
        : `Your ${planLabel} plan allows ${effectiveLimit} ${noun}${effectiveLimit === 1 ? "" : "s"}. You have ${totalJobs} — upgrade to post more.`,
  };
}

export async function getJobPostingEligibility(companyId) {
  return computeEligibility(companyId, "job");
}

export async function getInternshipPostingEligibility(companyId) {
  return computeEligibility(companyId, "internship");
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

export async function assertCanPostInternship(companyId) {
  const eligibility = await getInternshipPostingEligibility(companyId);

  if (!eligibility.canPost) {
    const error = new Error(eligibility.message);
    error.status = 403;
    error.code = "INTERNSHIP_LISTING_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  return eligibility;
}

/**
 * Convenience wrapper: routes to the job or internship check based on
 * the employmentType being submitted.
 */
export async function assertCanPostByType(companyId, employmentType) {
  if (employmentType === INTERNSHIP_TYPE) {
    return assertCanPostInternship(companyId);
  }
  return assertCanPostJob(companyId);
}