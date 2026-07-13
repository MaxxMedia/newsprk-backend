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
    message: canAdd
      ? isUnlimited
        ? `You can add unlimited supplier directories on the ${planLabel} plan.`
        : `${remaining} supplier director${remaining === 1 ? "y" : "ies"} remaining (${activeListings} of ${effectiveLimit} used on ${planLabel}).`
      : `Your ${planLabel} plan allows ${effectiveLimit} supplier directories. You have ${activeListings} — upgrade to add more.`,
  };
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



