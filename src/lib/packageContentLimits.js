// lib/packageContentLimits.js - FULL COMPLETE VERSION

import { prisma } from "./prisma.js";
import { getPlanLabel } from "./packagePricing.js";
import { getActiveSubscription } from "./packagePurchases.js";

/*
  ✅ ROOT-CAUSE FIX

  Every limit map below uses `null` to mean "unlimited" for that plan.
  The old code resolved a plan's limit like this:

      const limit = PLAN_X_LIMITS[plan] ?? PLAN_X_LIMITS.free;

  `??` (nullish coalescing) treats `null` as "value is missing" and
  falls through to the right-hand side. So whenever a plan's limit was
  intentionally `null` (unlimited), this line silently replaced it with
  the FREE plan's limit before any unlimited-check ever ran — which is
  exactly why Professional/Enterprise "unlimited" fields behaved like
  Free.

  Fix: resolve limits with explicit key lookup (`plan in MAP`), which
  only falls back to Free when the plan key genuinely doesn't exist in
  the map at all — never when the value is intentionally `null`.

  Do NOT use Infinity as an "unlimited" sentinel instead of null:
  JSON.stringify(Infinity) produces `null` on the wire anyway, so any
  API response silently turns your Infinity back into null for the
  frontend — with none of the isUnlimited handling that null-as-
  sentinel actually gets in this file. null is the one correct,
  intentional representation of "unlimited" here; keep it consistent
  everywhere.
*/
function resolvePlanLimit(limitsMap, plan) {
  return plan in limitsMap ? limitsMap[plan] : limitsMap.free;
}

// packages.ts: "Technical Articles" → free: false, basic: "4/year", professional: "12/year", enterprise: "Unlimited"
export const PLAN_ARTICLE_LIMITS = {
  free: 0,
  basic: 4,
  professional: 12,
  enterprise: null, // unlimited
};

// packages.ts: "Product Listings" → free: "5", basic: "25", professional: "100", enterprise: "Unlimited"
export const PLAN_PRODUCT_LISTING_LIMITS = {
  free: 5,
  basic: 25,
  professional: 100,
  enterprise: null, // unlimited
};

// packages.ts: "Cover Banner" → free: false, basic: "1", professional: "3", enterprise: "5"
export const PLAN_COVER_IMAGE_LIMITS = {
  free: 0,
  basic: 1,
  professional: 3,
  enterprise: 5,
};

// packages.ts: "WhatsApp Button" → free: false, basic: true, professional: true, enterprise: true
export const PLAN_WHATSAPP_ALLOWED = {
  free: false,
  basic: true,
  professional: true,
  enterprise: true,
};

// packages.ts: "Team Profiles" → free: false, basic: "5", professional: "10", enterprise: "Unlimited"
export const PLAN_TEAM_MEMBER_LIMITS = {
  free: 0,
  basic: 5,
  professional: 10,
  enterprise: null, // unlimited
};

// packages.ts: "Product Images" → free: "10", basic: "50", professional: "100", enterprise: "Unlimited"
export const PLAN_PRODUCT_IMAGE_LIMITS = {
  free: 10,
  basic: 50,
  professional: 100,
  enterprise: null, // unlimited
};

export const PLAN_COMPANY_PROFILE_LIMITS = {
  free: {
    descriptionLimit: 150,
    coverBanner: false,
    website: true,
    googleMap: true,
    whatsapp: false,
    contactDetails: "Limited",

    galleryImages: 0,
    factoryImages: 0,
    productImages: 10,
    productCategories: 3,
    productListings: 5,
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

    teamMembers: 0,
    inquiryForm: "Basic",
  },

  basic: {
    descriptionLimit: 1000,
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,
    contactDetails: "Full",

    galleryImages: 10,
    factoryImages: 10,
    productImages: 50,
    productCategories: 10,
    productListings: 25,
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

    teamMembers: 5,
    inquiryForm: "Standard",
  },

  professional: {
    descriptionLimit: 2500,
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,
    contactDetails: "Full",

    galleryImages: 15,
    factoryImages: 30,
    productImages: 100,
    productCategories: 30,
    productListings: 100,
    productVideos: 20,
    productCatalogues: 10,

    brochures: true,
    certifications: true,

    brandsRepresented: null, // unlimited
    industriesServed: null,  // unlimited
    exportMarkets: true,

    manufacturingCapabilities: "Complete",
    machineryList: "Detailed",
    qualityStandards: true,

    teamMembers: 10,
    inquiryForm: "Advanced",
  },

  enterprise: {
    descriptionLimit: null, // unlimited
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,
    contactDetails: "Full",

    galleryImages: null,
    factoryImages: null,
    productImages: null,
    productCategories: null,
    productListings: null,
    productVideos: null,
    productCatalogues: null,

    brochures: true,
    certifications: true,

    brandsRepresented: null,
    industriesServed: null,
    exportMarkets: true,

    manufacturingCapabilities: "Complete + Photos+Video",
    machineryList: "Detailed with Images",
    qualityStandards: true,

    teamMembers: null, // unlimited
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

export function countWords(text) {
  if (!text) return 0;
  if (typeof text !== "string") return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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

  // ✅ FIX: was `PLAN_ARTICLE_LIMITS[plan] ?? PLAN_ARTICLE_LIMITS.free`,
  // which silently turned Enterprise's `null` (unlimited) into Free's `0`.
  const yearlyLimit = resolvePlanLimit(PLAN_ARTICLE_LIMITS, plan);
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

  // ✅ FIX: same `??` trap as above
  const baseLimit = resolvePlanLimit(PLAN_PRODUCT_LISTING_LIMITS, plan);
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
    maxCoverImages: resolvePlanLimit(PLAN_COVER_IMAGE_LIMITS, plan), // ✅ FIX: consistent lookup, though this map has no nulls today
    allowWhatsapp: plan in PLAN_WHATSAPP_ALLOWED ? PLAN_WHATSAPP_ALLOWED[plan] : false,
    message: canAdd
      ? isUnlimited
        ? `You can add unlimited supplier directories on the ${planLabel} plan.`
        : `${remaining} supplier director${remaining === 1 ? "y" : "ies"} remaining (${activeListings} of ${effectiveLimit} used on ${planLabel}).`
      : `Your ${planLabel} plan allows ${effectiveLimit} supplier directories. You have ${activeListings} — upgrade to add more.`,
  };
}

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

  // ✅ FIX: same `??` trap — this is the exact bug behind
  // "Enterprise team members shows like Free/Basic instead of unlimited"
  const baseLimit = resolvePlanLimit(PLAN_TEAM_MEMBER_LIMITS, plan);
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

  // Note: this map's values are objects, never `null` themselves, so
  // `??` here is safe — only truly-missing plan keys fall back to Free.
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

  // Description word limit
  if (
    eligibility.descriptionLimit !== null &&
    data.description &&
    countWords(data.description) > eligibility.descriptionLimit
  ) {
    const error = new Error(
      `Company description cannot exceed ${eligibility.descriptionLimit} words on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "DESCRIPTION_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  // Google Map gating
  if (!eligibility.googleMap && data.googleMapUrl) {
    const error = new Error(
      "Google Map is not available on your current plan."
    );
    error.status = 403;
    error.code = "GOOGLE_MAP_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  // Cover Banner - already handled by sanitizeSupplierDirectoryMedia
  // but double-check here too
  if (!eligibility.coverBanner && data.coverImages?.length > 0) {
    const error = new Error(
      "Cover images are not available on the Free plan. Upgrade to Basic or higher."
    );
    error.status = 403;
    error.code = "COVER_BANNER_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  // WhatsApp - handled by sanitizeSupplierDirectoryMedia

  // Company Gallery limits
  if (
    eligibility.galleryImages !== null &&
    Array.isArray(data.companyGallery) &&
    data.companyGallery.filter(Boolean).length > eligibility.galleryImages
  ) {
    const error = new Error(
      `Only ${eligibility.galleryImages} company gallery images are allowed on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "COMPANY_GALLERY_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  // Factory Gallery limits
  if (
    eligibility.factoryImages !== null &&
    Array.isArray(data.factoryGallery) &&
    data.factoryGallery.filter(Boolean).length > eligibility.factoryImages
  ) {
    const error = new Error(
      `Only ${eligibility.factoryImages} factory images are allowed on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "FACTORY_GALLERY_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  // Product Gallery limits
  if (
    eligibility.productImages !== null &&
    Array.isArray(data.productGallery) &&
    data.productGallery.filter(Boolean).length > eligibility.productImages
  ) {
    const error = new Error(
      `Only ${eligibility.productImages} product images are allowed on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "PRODUCT_IMAGE_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  // Product Videos limits
  if (
    eligibility.productVideos !== null &&
    Array.isArray(data.videoGallery) &&
    data.videoGallery.filter(Boolean).length > eligibility.productVideos
  ) {
    const error = new Error(
      `Only ${eligibility.productVideos} product videos are allowed on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "PRODUCT_VIDEO_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  // Product Catalogues limits
  if (
    eligibility.productCatalogues !== null &&
    Array.isArray(data.productCatalogues) &&
    data.productCatalogues.filter(Boolean).length > eligibility.productCatalogues
  ) {
    const error = new Error(
      `Only ${eligibility.productCatalogues} product catalogues are allowed on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "PRODUCT_CATALOGUE_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  // Company Brochure
  if (!eligibility.brochures && data.companyBrochure?.length > 0) {
    const error = new Error(
      "Company Brochure is not available on the Free plan."
    );
    error.status = 403;
    error.code = "BROCHURE_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  // Certifications
  if (!eligibility.certifications && data.certifications?.length > 0) {
    const error = new Error(
      "Certifications are not available on the Free plan."
    );
    error.status = 403;
    error.code = "CERTIFICATIONS_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  // Brands Represented limits
  if (
    eligibility.brandsRepresented !== null &&
    Array.isArray(data.brandsRepresented) &&
    data.brandsRepresented.filter(Boolean).length > eligibility.brandsRepresented
  ) {
    const error = new Error(
      `Only ${eligibility.brandsRepresented} brands can be represented on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "BRANDS_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  // Industries Served limits
  if (
    eligibility.industriesServed !== null &&
    Array.isArray(data.industriesServed) &&
    data.industriesServed.filter(Boolean).length > eligibility.industriesServed
  ) {
    const error = new Error(
      `Only ${eligibility.industriesServed} industries can be served on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "INDUSTRIES_SERVED_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
  }

  // Export Markets - hide for free
  if (!eligibility.exportMarkets && data.exportMarkets?.filter(Boolean).length > 0) {
    const error = new Error(
      "Export Markets are not available on the Free plan."
    );
    error.status = 403;
    error.code = "EXPORT_MARKETS_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  // Manufacturing Capabilities
  if (!eligibility.manufacturingCapabilities && data.manufacturingCapabilities) {
    const error = new Error(
      "Manufacturing Capabilities are not available on the Free plan."
    );
    error.status = 403;
    error.code = "MANUFACTURING_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  // Machinery List
  if (!eligibility.machineryList && data.machineryList) {
    const error = new Error(
      "Machinery List is not available on the Free plan."
    );
    error.status = 403;
    error.code = "MACHINERY_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  // Quality Standards
  if (!eligibility.qualityStandards && data.qualityStandards) {
    const error = new Error(
      "Quality Standards are not available on the Free plan."
    );
    error.status = 403;
    error.code = "QUALITY_STANDARDS_NOT_ALLOWED";
    error.eligibility = eligibility;
    throw error;
  }

  // Team Members - handled by assertCanAddTeamMember separately
  // but also check here for safety
  if (
    eligibility.teamMembers !== null &&
    data.teamMembers &&
    Array.isArray(data.teamMembers) &&
    data.teamMembers.filter(Boolean).length > eligibility.teamMembers
  ) {
    const error = new Error(
      `Only ${eligibility.teamMembers} team members are allowed on the ${eligibility.planLabel} plan.`
    );
    error.status = 403;
    error.code = "TEAM_MEMBER_LIMIT_REACHED";
    error.eligibility = eligibility;
    throw error;
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

export function sanitizeSupplierDirectoryMedia({ plan, coverImages, socialLinks }) {
  // ✅ FIX: consistent lookup (this map has no nulls today, but keeping
  // the same resolver everywhere prevents this class of bug if it
  // ever gets an "unlimited cover images" tier added later).
  const maxCoverImages = resolvePlanLimit(PLAN_COVER_IMAGE_LIMITS, plan);
  const allowWhatsapp = plan in PLAN_WHATSAPP_ALLOWED ? PLAN_WHATSAPP_ALLOWED[plan] : false;
  const planLabel = getPlanLabel(plan);

  let incomingCoverImages = [];
  if (Array.isArray(coverImages)) {
    incomingCoverImages = coverImages.filter((url) => typeof url === "string" && url.trim().length > 0);
  } else if (typeof coverImages === "string" && coverImages.trim().length > 0) {
    incomingCoverImages = [coverImages];
  }

  // maxCoverImages === null would mean "unlimited" if that map ever
  // gains a null tier — guard against treating null as 0 here too.
  const isCoverUnlimited = maxCoverImages === null;

  if (!isCoverUnlimited && maxCoverImages === 0 && incomingCoverImages.length > 0) {
    const error = new Error(
      "Cover images are not available on the Free plan. Upgrade to Basic or higher to upload a cover image."
    );
    error.status = 403;
    error.code = "COVER_IMAGE_NOT_ALLOWED";
    throw error;
  }

  if (!isCoverUnlimited && incomingCoverImages.length > maxCoverImages) {
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
    coverImages: incomingCoverImages,
    socialLinks: sanitizedSocialLinks,
  };
}

export async function assertAndSanitizeSupplierDirectoryMedia(companyId, { coverImages, socialLinks }) {
  const activeSubscription = await getActiveSubscription(companyId, prisma);
  return sanitizeSupplierDirectoryMedia({
    plan: activeSubscription.plan,
    coverImages,
    socialLinks,
  });
}