import { prisma } from "./prisma.js";
import { getPlanLabel } from "./packagePricing.js";
import { getActiveSubscription } from "./packagePurchases.js";

export const PLAN_ARTICLE_LIMITS = {
  free: 0,
  basic: 4,
  professional: null,
  enterprise: null,
};

export const PLAN_PRODUCT_LISTING_LIMITS = {
  free: 5,
  basic: 25,
  professional: null,
  enterprise: null,
};

/* ==========================================================
   NEW: Supplier Directory media permissions (cover images + WhatsApp)
   ========================================================== */
export const PLAN_COVER_IMAGE_LIMITS = {
  free: 0,
  basic: 1,
  professional: 3,
  enterprise: 5,
};

export const PLAN_WHATSAPP_ALLOWED = {
  free: false,
  basic: true,
  professional: true,
  enterprise: true,
};

/* ==========================================================
   NEW: Team Profiles package limits.
   Free -> 0, Basic -> 5, Professional -> 10, Enterprise -> Unlimited (null)
   ========================================================== */
export const PLAN_TEAM_MEMBER_LIMITS = {
  free: 0,
  basic: 5,
  professional: 10,
  enterprise: null,
};

export const PLAN_COMPANY_PROFILE_LIMITS = {
  free: {
    descriptionLimit: 150,
    coverBanner: false,
    website: true,
    googleMap: true,
    whatsapp: false,

    galleryImages: 0,
    factoryImages: 0,
    productCategories: 3,
    productListings: 5,
    productImages: 10,
    productVideos: 0,
    productCatalogues: 0,

    brochures: false,
    certifications: false,

    brandsRepresented: 0,
    industriesServed: 5,
    exportMarkets: false,

    manufacturingCapabilities: false,
    machineryList: false,
    qualityStandards: false,

    inquiryForm: "Basic",
  },

  basic: {
    descriptionLimit: 1000,
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,

    galleryImages: 10,
    factoryImages: 10,
    productCategories: 10,
    productListings: 25,
    productImages: 50,
    productVideos: 5,
    productCatalogues: 2,

    brochures: true,
    certifications: true,

    brandsRepresented: 10,
    industriesServed: 20,
    exportMarkets: true,

    manufacturingCapabilities: "Basic",
    machineryList: "Basic",
    qualityStandards: true,

    inquiryForm: "Standard",
  },

  professional: {
    descriptionLimit: 2500,
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,

    galleryImages: 15,
    factoryImages: 30,
    productCategories: 30,
    productListings: 100,
    productImages: 100,
    productVideos: 20,
    productCatalogues: 10,

    brochures: true,
    certifications: true,

    brandsRepresented: null,
    industriesServed: null,
    exportMarkets: true,

    manufacturingCapabilities: "Complete",
    machineryList: "Detailed",
    qualityStandards: true,

    inquiryForm: "Advanced",
  },

  enterprise: {
    descriptionLimit: null,
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,

    galleryImages: null,
    factoryImages: null,
    productCategories: null,
    productListings: null,
    productImages: null,
    productVideos: null,
    productCatalogues: null,

    brochures: true,
    certifications: true,

    brandsRepresented: null,
    industriesServed: null,
    exportMarkets: true,

    manufacturingCapabilities: "Complete + Photos + Video",
    machineryList: "Detailed with Images",
    qualityStandards: true,

    inquiryForm: "Custom",
  },
};

function getYearStart() {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
}

export function normalizeProductSupplies(productSupplies) {
  if (!productSupplies) return [];
  if (typeof productSupplies === "string") {
    try {
      return normalizeProductSupplies(JSON.parse(productSupplies));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(productSupplies)) return [];
  return productSupplies;
}

export function countProductListings(productSupplies) {
  const items = normalizeProductSupplies(productSupplies);
  return items.filter((item) => {
    if (typeof item === "string") return item.trim().length > 0;
    if (item && typeof item === "object" && "name" in item) {
      return String(item.name || "").trim().length > 0;
    }
    return false;
  }).length;
}

export async function getCompanyDirectoryCount(companyId, prismaClient = prisma) {
  return prismaClient.supplierDirectory.count({
    where: {
      OR: [
        { companyId },
        {
          companyId: null,
          User_SupplierDirectory_submittedByIdToUser: { companyId },
        },
      ],
    },
  });
}

/** @deprecated Use getCompanyDirectoryCount — package limit is per supplier directory */
export async function getCompanyProductListingCount(companyId, prismaClient = prisma) {
  return getCompanyDirectoryCount(companyId, prismaClient);
}

/* ==========================================================
   NEW: Team member counting.
   Only ACTIVE memberships count toward the plan limit —
   PENDING and REJECTED are intentionally excluded.
   ========================================================== */
export async function getActiveTeamMemberCount(companyId, prismaClient = prisma) {
  return prismaClient.companyTeamMember.count({
    where: {
      companyId,
      status: "ACTIVE",
    },
  });
}

export async function getArticlePostingEligibility(companyId) {
  if (!companyId) {
    return {
      canCreate: false,
      reason: "NO_COMPANY",
      message: "Link a company profile before publishing articles.",
      upgradeRequired: false,
      remaining: 0,
      effectiveLimit: 0,
      articlesThisYear: 0,
      isUnlimited: false,
    };
  }

  const activeSubscription = await getActiveSubscription(companyId, prisma);
  const plan = activeSubscription.plan;
  const yearlyLimit = PLAN_ARTICLE_LIMITS[plan] ?? PLAN_ARTICLE_LIMITS.free;
  const isUnlimited = yearlyLimit === null;
  const yearStart = getYearStart();

  const articlesThisYear = await prisma.post.count({
    where: {
      companyId,
      category: { slug: "articles" },
      createdAt: { gte: yearStart },
    },
  });

  const planLabel = getPlanLabel(plan);
  const effectiveLimit = isUnlimited ? null : yearlyLimit;
  const remaining = isUnlimited ? null : Math.max(0, effectiveLimit - articlesThisYear);
  const canCreate = isUnlimited || articlesThisYear < effectiveLimit;

  return {
    canCreate,
    plan,
    planLabel,
    articlesThisYear,
    effectiveLimit: isUnlimited ? "Unlimited" : effectiveLimit,
    remaining,
    isUnlimited,
    periodLabel: "this year",
    upgradeRequired: !canCreate,
    message: canCreate
      ? isUnlimited
        ? `You can publish unlimited technical articles on the ${planLabel} plan.`
        : `${remaining} technical article${remaining === 1 ? "" : "s"} remaining this year (${articlesThisYear} of ${effectiveLimit} used on ${planLabel}).`
      : plan === "free"
        ? "Technical articles are not included on the Free plan. Upgrade to Basic or higher to publish articles."
        : `Your ${planLabel} plan allows ${effectiveLimit} technical articles per year. You've used ${articlesThisYear} — upgrade to post more.`,
  };
}

/**
 * ✅ EXTENDED: now also returns maxCoverImages + allowWhatsapp, computed from
 * the same `plan` this function already resolves via getActiveSubscription().
 * This lets the frontend reuse the ContentLimitEligibility object it already
 * fetches (fetchProductListingEligibility) instead of adding a new API call.
 */
export async function getProductListingEligibility(companyId) {
  if (!companyId) {
    return {
      canAdd: false,
      reason: "NO_COMPANY",
      message: "Link a company profile before adding product listings.",
      upgradeRequired: false,
      remaining: 0,
      effectiveLimit: 0,
      activeListings: 0,
      isUnlimited: false,
      maxCoverImages: PLAN_COVER_IMAGE_LIMITS.free,
      allowWhatsapp: PLAN_WHATSAPP_ALLOWED.free,
    };
  }

  const activeSubscription = await getActiveSubscription(companyId, prisma);
  const plan = activeSubscription.plan;
  const baseLimit = PLAN_PRODUCT_LISTING_LIMITS[plan] ?? PLAN_PRODUCT_LISTING_LIMITS.free;
  const isUnlimited = baseLimit === null;

  const activeListings = await getCompanyDirectoryCount(companyId, prisma);
  const effectiveLimit = isUnlimited ? null : baseLimit;
  const remaining = isUnlimited ? null : Math.max(0, effectiveLimit - activeListings);
  const canAdd = isUnlimited || activeListings < effectiveLimit;
  const planLabel = getPlanLabel(plan);

  return {
    canAdd,
    plan,
    planLabel,
    activeListings,
    effectiveLimit: isUnlimited ? "Unlimited" : effectiveLimit,
    remaining,
    isUnlimited,
    upgradeRequired: !canAdd,
    // ---- NEW: supplier directory media permissions ----
    maxCoverImages: PLAN_COVER_IMAGE_LIMITS[plan] ?? PLAN_COVER_IMAGE_LIMITS.free,
    allowWhatsapp: PLAN_WHATSAPP_ALLOWED[plan] ?? false,
    message: canAdd
      ? isUnlimited
        ? `You can add unlimited supplier directories on the ${planLabel} plan.`
        : `${remaining} supplier director${remaining === 1 ? "y" : "ies"} remaining (${activeListings} of ${effectiveLimit} used on ${planLabel}).`
      : `Your ${planLabel} plan allows ${effectiveLimit} supplier directories. You have ${activeListings} — upgrade to add more.`,
  };
}

/**
 * NEW: Team Profiles eligibility.
 * Resolves the company's active subscription plan (Company.subscriptionPlan,
 * via getActiveSubscription — same source of truth used everywhere else in
 * this file), determines the plan's team member limit, and counts only
 * ACTIVE CompanyTeamMember rows for that company (PENDING/REJECTED excluded).
 */
export async function getTeamMemberEligibility(companyId) {
  if (!companyId) {
    return {
      canAdd: false,
      reason: "NO_COMPANY",
      message: "Link a company profile before adding team members.",
      upgradeRequired: false,
      remaining: 0,
      effectiveLimit: 0,
      activeMembers: 0,
      isUnlimited: false,
    };
  }

  const activeSubscription = await getActiveSubscription(companyId, prisma);
  const plan = activeSubscription.plan;
  const baseLimit = PLAN_TEAM_MEMBER_LIMITS[plan] ?? PLAN_TEAM_MEMBER_LIMITS.free;
  const isUnlimited = baseLimit === null;

  const activeMembers = await getActiveTeamMemberCount(companyId, prisma);
  const effectiveLimit = isUnlimited ? null : baseLimit;
  const remaining = isUnlimited ? null : Math.max(0, effectiveLimit - activeMembers);
  const canAdd = isUnlimited || activeMembers < effectiveLimit;
  const planLabel = getPlanLabel(plan);

  return {
    canAdd,
    plan,
    planLabel,
    activeMembers,
    effectiveLimit: isUnlimited ? "Unlimited" : effectiveLimit,
    remaining,
    isUnlimited,
    upgradeRequired: !canAdd,
    message: canAdd
      ? isUnlimited
        ? `You can add unlimited team members on the ${planLabel} plan.`
        : `${remaining} team member slot${remaining === 1 ? "" : "s"} remaining (${activeMembers} of ${effectiveLimit} used on ${planLabel}).`
      : "Your team profile limit has been reached. Upgrade your subscription to add more members.",
  };
}

/**
 * NEW: Throws a standardized error when the company's team member limit
 * has been reached. Use this in approveTeamMember before flipping a
 * membership to ACTIVE.
 */
export async function assertCanAddTeamMember(companyId) {
  const eligibility = await getTeamMemberEligibility(companyId);

  if (!eligibility.canAdd) {
    const error = new Error(
      "Your team profile limit has been reached. Upgrade your subscription to add more members."
    );
    error.status = 403;
    error.code = "TEAM_MEMBER_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  return eligibility;
}

export async function getCompanyProfileEligibility(companyId) {
  if (!companyId) {
    return {
      canEdit: false,
      reason: "NO_COMPANY",
      message: "Link a company profile before editing it.",
      upgradeRequired: false,
    };
  }

  const activeSubscription = await getActiveSubscription(companyId, prisma);
  const plan = activeSubscription.plan;

  const limits =
    PLAN_COMPANY_PROFILE_LIMITS[plan] ??
    PLAN_COMPANY_PROFILE_LIMITS.free;

  return {
    canEdit: true,
    plan,
    planLabel: getPlanLabel(plan),
    ...limits,
  };
}

export async function assertCanCreateArticle(companyId) {
  const eligibility = await getArticlePostingEligibility(companyId);

  if (!eligibility.canCreate) {
    const error = new Error(eligibility.message);
    error.status = 403;
    error.code = "ARTICLE_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  return eligibility;
}

export async function assertProductListingCount(companyId, requestedCount) {
  const eligibility = await getProductListingEligibility(companyId);

  if (eligibility.isUnlimited) {
    return eligibility;
  }

  if (requestedCount > eligibility.effectiveLimit) {
    const error = new Error(eligibility.message);
    error.status = 403;
    error.code = "PRODUCT_LISTING_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  return eligibility;
}

export async function assertCompanyProfileLimits(companyId, data) {
  const eligibility = await getCompanyProfileEligibility(companyId);

  if (!eligibility.canEdit) {
    const error = new Error(eligibility.message);
    error.status = 403;
    error.code = "COMPANY_PROFILE_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  if (
    eligibility.descriptionLimit !== null &&
    data.companyDescription &&
    data.companyDescription.length > eligibility.descriptionLimit
  ) {
    const error = new Error(
      `Company description cannot exceed ${eligibility.descriptionLimit} characters.`
    );
    error.status = 403;
    error.code = "DESCRIPTION_LIMIT_REACHED";
    throw error;
  }

  if (!eligibility.coverBanner && data.companyCoverImageUrl) {
    const error = new Error(
      "Company cover banner is available only on Basic plan and above."
    );
    error.status = 403;
    error.code = "COVER_BANNER_NOT_ALLOWED";
    throw error;
  }

  if (!eligibility.whatsapp && data.companyWhatsapp) {
    const error = new Error(
      "WhatsApp button is available only on Basic plan and above."
    );
    error.status = 403;
    error.code = "WHATSAPP_NOT_ALLOWED";
    throw error;
  }

  if (
    eligibility.galleryImages !== null &&
    Array.isArray(data.companyGallery) &&
    data.companyGallery.filter(Boolean).length >
    eligibility.galleryImages
  ) {
    throw new Error(
      `Only ${eligibility.galleryImages} company gallery images are allowed.`
    );
  }

  if (
    eligibility.factoryImages !== null &&
    Array.isArray(data.factoryGallery) &&
    data.factoryGallery.filter(Boolean).length >
    eligibility.factoryImages
  ) {
    throw new Error(
      `Only ${eligibility.factoryImages} factory images are allowed.`
    );
  }

  if (
    eligibility.productVideos !== null &&
    Array.isArray(data.videoGallery) &&
    data.videoGallery.filter(Boolean).length >
    eligibility.productVideos
  ) {
    throw new Error(
      `Only ${eligibility.productVideos} product videos are allowed.`
    );
  }

  if (
    eligibility.productCatalogues !== null &&
    Array.isArray(data.productCatalogues) &&
    data.productCatalogues.filter(Boolean).length >
    eligibility.productCatalogues
  ) {
    throw new Error(
      `Only ${eligibility.productCatalogues} product catalogues are allowed.`
    );
  }

  if (
    eligibility.brandsRepresented !== null &&
    Array.isArray(data.brandsRepresented) &&
    data.brandsRepresented.filter(Boolean).length >
    eligibility.brandsRepresented
  ) {
    throw new Error(
      `Only ${eligibility.brandsRepresented} brands are allowed.`
    );
  }

  if (
    eligibility.industriesServed !== null &&
    Array.isArray(data.industriesServed) &&
    data.industriesServed.filter(Boolean).length >
    eligibility.industriesServed
  ) {
    throw new Error(
      `Only ${eligibility.industriesServed} industries are allowed.`
    );
  }

  if (
    !eligibility.exportMarkets &&
    Array.isArray(data.exportMarkets) &&
    data.exportMarkets.filter(Boolean).length
  ) {
    throw new Error(
      "Export Markets are available only on Basic plan and above."
    );
  }

  if (
    !eligibility.brochures &&
    Array.isArray(data.companyBrochure) &&
    data.companyBrochure.filter(Boolean).length
  ) {
    throw new Error(
      "Company Brochure is available only on Basic plan and above."
    );
  }

  if (
    !eligibility.manufacturingCapabilities &&
    data.manufacturingCapabilities
  ) {
    throw new Error(
      "Manufacturing Capabilities are available only on Basic plan."
    );
  }

  if (
    !eligibility.machineryList &&
    data.machineryList
  ) {
    throw new Error(
      "Machinery List is available only on Basic plan."
    );
  }

  if (
    !eligibility.qualityStandards &&
    data.qualityStandards
  ) {
    throw new Error(
      "Quality Standards are available only on Basic plan."
    );
  }


  return eligibility;
}

export function applyProductListingLimit(productSupplies, limit) {
  const items = normalizeProductSupplies(productSupplies);
  if (limit === null) {
    return items;
  }

  const filled = items.filter((item) => {
    if (typeof item === "string") return item.trim().length > 0;
    if (item && typeof item === "object" && "name" in item) {
      return String(item.name || "").trim().length > 0;
    }
    return false;
  });

  return filled.slice(0, limit);
}

/* ==========================================================
   NEW: Supplier Directory media validation + sanitization.
   Single source of truth used by createDirectory and
   updateDirectory in suppliersController.js — never trust the
   frontend, always re-derive the plan server-side.
   ========================================================== */

/**
 * Pure function: given a resolved plan + raw coverImages/socialLinks,
 * returns sanitized values or throws a validation error.
 * - FREE + non-empty coverImages -> throws (rejected, not silently dropped)
 * - paid plan exceeding its max -> throws with a clear message
 * - whatsapp is silently stripped from socialLinks when not allowed,
 *   per spec ("Remove WhatsApp from socialLinks before saving")
 * 
 * ✅ UPDATED: Handles both string (single URL) and array inputs
 */
export function sanitizeSupplierDirectoryMedia({ plan, coverImages, socialLinks }) {
  const maxCoverImages = PLAN_COVER_IMAGE_LIMITS[plan] ?? PLAN_COVER_IMAGE_LIMITS.free;
  const allowWhatsapp = PLAN_WHATSAPP_ALLOWED[plan] ?? false;
  const planLabel = getPlanLabel(plan);

  // ✅ Handle both string and array inputs
  let incomingCoverImages = [];
  if (Array.isArray(coverImages)) {
    incomingCoverImages = coverImages.filter((url) => typeof url === "string" && url.trim().length > 0);
  } else if (typeof coverImages === "string" && coverImages.trim().length > 0) {
    incomingCoverImages = [coverImages];
  }

  if (maxCoverImages === 0 && incomingCoverImages.length > 0) {
    const error = new Error(
      "Cover images are not available on the Free plan. Upgrade to Basic or higher to upload a cover image."
    );
    error.status = 403;
    error.code = "COVER_IMAGE_NOT_ALLOWED";
    throw error;
  }

  if (incomingCoverImages.length > maxCoverImages) {
    const overBy = incomingCoverImages.length - maxCoverImages;
    const error = new Error(
      `Your ${planLabel} plan allows a maximum of ${maxCoverImages} cover image${maxCoverImages === 1 ? "" : "s"}. Please remove ${overBy} image${overBy === 1 ? "" : "s"} or upgrade your plan.`
    );
    error.status = 403;
    error.code = "COVER_IMAGE_LIMIT_EXCEEDED";
    throw error;
  }

  const sanitizedSocialLinks = { ...(socialLinks || {}) };
  if (!allowWhatsapp) {
    delete sanitizedSocialLinks.whatsapp;
  }

  return {
    coverImages: incomingCoverImages, // Always returns an array
    socialLinks: sanitizedSocialLinks,
  };
}

/**
 * Resolves the company's active plan via getActiveSubscription() and applies
 * sanitizeSupplierDirectoryMedia(). Use this in the controller instead of
 * duplicating the plan lookup.
 */
export async function assertAndSanitizeSupplierDirectoryMedia(companyId, { coverImages, socialLinks }) {
  const activeSubscription = await getActiveSubscription(companyId, prisma);
  return sanitizeSupplierDirectoryMedia({
    plan: activeSubscription.plan,
    coverImages,
    socialLinks,
  });
}