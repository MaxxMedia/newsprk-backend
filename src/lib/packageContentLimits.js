// lib/packageContentLimits.js - FULL COMPLETE VERSION
// Every limit below is kept in sync with SUBSCRIPTION_FEATURES in lib/packages.ts.
// If you change a number here, change the matching row in packages.ts too
// (and vice versa) — they must always agree, since packages.ts is what
// customers see before they buy, and this file is what actually enforces it.

import { prisma } from "./prisma.js";
import { getPlanLabel } from "./packagePricing.js";
import { getActiveSubscription } from "./packagePurchases.js";

// packages.ts: "Technical Articles" → free: false, basic: "4/year", professional: "12/year", enterprise: "Unlimited"
export const PLAN_ARTICLE_LIMITS = {
  free: 0,
  basic: 4,
  professional: 12, // ✅ FIX: was null (unlimited) — packages.ts advertises "12/year"
  enterprise: null,
};

// packages.ts: "Product Listings" → free: "5", basic: "25", professional: "100", enterprise: "Unlimited"
export const PLAN_PRODUCT_LISTING_LIMITS = {
  free: 5,
  basic: 25,
  professional: 100, // ✅ FIX: was null (unlimited) — packages.ts advertises "100"
  enterprise: null,
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
  enterprise: null,
};

// packages.ts: "Product Images" → free: "10", basic: "50", professional: "100", enterprise: "Unlimited"
export const PLAN_PRODUCT_IMAGE_LIMITS = {
  free: 10,
  basic: 50,
  professional: 100,
  enterprise: null,
};

export const PLAN_COMPANY_PROFILE_LIMITS = {
  free: {
    // packages.ts: "Company Description" → "150 Words"
    descriptionLimit: 150,
    // packages.ts: "Cover Banner" → false
    coverBanner: false,
    // packages.ts: "Website Link" → true
    website: true,
    // packages.ts: "Google Map" → true (free tier gets it per packages.ts)
    googleMap: true,
    // packages.ts: "WhatsApp Button" → false
    whatsapp: false,
    // packages.ts: "Contact Details" → "Limited"
    contactDetails: "Limited",

    // packages.ts: "Company Gallery" → false
    galleryImages: 0,
    // packages.ts: "Factory Images" → false
    factoryImages: 0,
    // packages.ts: "Product Images" → "10"
    productImages: 10,
    // packages.ts: "Product Categories" → "3"
    productCategories: 3,
    // packages.ts: "Product Listings" → "5"
    productListings: 5,
    // packages.ts: "Product Videos" → false
    productVideos: 0,
    // packages.ts: "Product Catalogues (PDF)" → false
    productCatalogues: 0,

    // packages.ts: "Company Brochure" → false
    brochures: false,
    // packages.ts: "Certifications Display" → false
    certifications: false,

    // packages.ts: "Brands Represented" → false
    brandsRepresented: 0,
    // packages.ts: "Industries Served" → "5"
    industriesServed: 5,
    // packages.ts: "Export Markets" → false
    exportMarkets: false,

    // packages.ts: "Manufacturing Capabilities" → false
    manufacturingCapabilities: false,
    // packages.ts: "Machinery List" → false
    machineryList: false,
    // packages.ts: "Quality Standards" → false
    qualityStandards: false,

    // packages.ts: "Team Profiles" → false
    teamMembers: 0,
    inquiryForm: "Basic",
  },

  basic: {
    // "1000 Words"
    descriptionLimit: 1000,
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,
    contactDetails: "Full",

    // "10 Images"
    galleryImages: 10,
    // "10"
    factoryImages: 10,
    // "50"
    productImages: 50,
    // "10"
    productCategories: 10,
    // "25"
    productListings: 25,
    // "5"
    productVideos: 5,
    // "2"
    productCatalogues: 2,

    brochures: true,
    certifications: true,

    // "10"
    brandsRepresented: 10,
    // "20"
    industriesServed: 20,
    exportMarkets: true,

    // "Basic"
    manufacturingCapabilities: "Basic",
    machineryList: "Basic",
    qualityStandards: true,

    // "5"
    teamMembers: 5,
    inquiryForm: "Standard",
  },

  professional: {
    // "2500 Words"
    descriptionLimit: 2500,
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,
    contactDetails: "Full",

    // "15 Images"
    galleryImages: 15,
    // "30"
    factoryImages: 30,
    // "100"
    productImages: 100,
    // "30"
    productCategories: 30,
    // "100"
    productListings: 100,
    // "20"
    productVideos: 20,
    // "10"
    productCatalogues: 10,

    brochures: true,
    certifications: true,

    // "Unlimited"
    brandsRepresented: null,
    // "Unlimited"
    industriesServed: null,
    exportMarkets: true,

    // "Complete"
    manufacturingCapabilities: "Complete",
    // "Detailed"
    machineryList: "Detailed",
    qualityStandards: true,

    // "10"
    teamMembers: 10,
    inquiryForm: "Advanced",
  },

  enterprise: {
    // "Unlimited"
    descriptionLimit: null,
    coverBanner: true,
    website: true,
    googleMap: true,
    whatsapp: true,
    contactDetails: "Full",

    // all "Unlimited" per packages.ts
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

    // "Complete + Photos+Video"
    manufacturingCapabilities: "Complete + Photos+Video",
    // "Detailed with Images"
    machineryList: "Detailed with Images",
    qualityStandards: true,

    // "Unlimited"
    teamMembers: null,
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
    maxCoverImages: PLAN_COVER_IMAGE_LIMITS[plan] ?? PLAN_COVER_IMAGE_LIMITS.free,
    allowWhatsapp: PLAN_WHATSAPP_ALLOWED[plan] ?? false,
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
  const maxCoverImages = PLAN_COVER_IMAGE_LIMITS[plan] ?? PLAN_COVER_IMAGE_LIMITS.free;
  const allowWhatsapp = PLAN_WHATSAPP_ALLOWED[plan] ?? false;
  const planLabel = getPlanLabel(plan);

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