// ⚠️ Adjust this import path to match where your prisma client actually lives
// relative to this file (e.g. "../lib/prisma.js" if this file sits in src/utils/).
import { prisma } from "../lib/prisma.js";

// These are now just DEFAULTS / FALLBACKS — used only when there's no
// matching row in the Package table (i.e. admin hasn't overridden it yet).
const SUBSCRIPTION_PLANS = {
  free: { name: "Free", price: 0, durationDays: null },
  basic: { name: "Basic", price: 9999, durationDays: 365 },
  professional: { name: "Professional", price: 24999, durationDays: 365 },
  enterprise: { name: "Enterprise", price: 99999, durationDays: 365 },
};

const BANNER_PACKAGES = {
  "homepage-hero": {
    label: "Homepage Hero Banner",
    monthly: 40000,
    quarterly: 108000,
    annual: 360000,
  },
  "homepage-sidebar": {
    label: "Homepage Sidebar",
    monthly: 18000,
    quarterly: 48000,
    annual: 160000,
  },
  category: {
    label: "Category Banner",
    monthly: 12000,
    quarterly: 32000,
    annual: 110000,
  },
  article: {
    label: "Article Banner",
    monthly: 8000,
    quarterly: 22000,
    annual: 75000,
  },
  sticky: {
    label: "Sticky Banner",
    monthly: 25000,
    quarterly: 70000,
    annual: 240000,
  },
};

const BANNER_DURATION_DAYS = {
  monthly: 30,
  quarterly: 90,
  annual: 365,
};

const SPONSORED_PACKAGES = {
  bronze: { name: "Bronze", price: 15000 },
  silver: { name: "Silver", price: 35000 },
  gold: { name: "Gold", price: 60000 },
};

const RECRUITMENT_PACKAGES = {
  "single-job": { name: "Single Job (Monthly · 30 Days)", price: 2000, durationDays: 30 },
};

// Look up a live DB override for a given package id.
// Returns null if there's no row, it's deleted, or it's inactive
// (an inactive package shouldn't be purchasable even if someone has the link).
async function getDbPackage(id) {
  try {
    const pkg = await prisma.package.findUnique({ where: { id } });
    if (!pkg || pkg.deletedAt || !pkg.isActive) return null;
    return pkg;
  } catch (err) {
    console.error(`Failed to look up DB package "${id}":`, err);
    return null; // fail safe — falls back to hardcoded price below
  }
}

export async function resolvePackage(packageType, packageId) {
  const type = String(packageType || "").toUpperCase();

  if (type === "SUBSCRIPTION") {
    const fallback = SUBSCRIPTION_PLANS[packageId];
    const dbPkg = await getDbPackage(packageId);
    if (!fallback && !dbPkg) return null;

    return {
      packageType: "SUBSCRIPTION",
      packageId,
      packageName: `${dbPkg?.name || fallback?.name} Subscription`,
      amount: dbPkg?.price ?? fallback?.price,
      durationDays: dbPkg?.metadata?.durationDays ?? fallback?.durationDays,
    };
  }

  if (type === "BANNER") {
    const [bannerKey, duration] = String(packageId).split(":");
    const fallback = BANNER_PACKAGES[bannerKey];
    const dbPkg = await getDbPackage(bannerKey);

    // DB banner packages store per-duration pricing in metadata: { monthly, quarterly, annual }
    const dbAmount = dbPkg?.metadata?.[duration];
    const fallbackAmount = fallback?.[duration];
    const amount = dbAmount ?? fallbackAmount;

    if (amount === undefined) return null;

    return {
      packageType: "BANNER",
      packageId: `${bannerKey}:${duration}`,
      packageName: `${dbPkg?.name || fallback?.label} (${duration})`,
      amount,
      durationDays: BANNER_DURATION_DAYS[duration] ?? 30,
      metadata: { bannerKey, duration },
    };
  }

  if (type === "SPONSORED") {
    const fallback = SPONSORED_PACKAGES[packageId];
    const dbPkg = await getDbPackage(packageId);
    if (!fallback && !dbPkg) return null;

    return {
      packageType: "SPONSORED",
      packageId,
      packageName: `${dbPkg?.name || fallback?.name} Sponsored Content`,
      amount: dbPkg?.price ?? fallback?.price,
      durationDays: null,
    };
  }

  if (type === "RECRUITMENT") {
    const fallback = RECRUITMENT_PACKAGES[packageId];
    const dbPkg = await getDbPackage(packageId);
    if (!fallback && !dbPkg) return null;

    return {
      packageType: "RECRUITMENT",
      packageId,
      packageName: dbPkg?.name || fallback?.name,
      amount: dbPkg?.price ?? fallback?.price,
      durationDays: dbPkg?.metadata?.durationDays ?? fallback?.durationDays ?? 30,
    };
  }

  return null;
}

export function getPlanLabel(planId) {
  return SUBSCRIPTION_PLANS[planId]?.name ?? planId;
}

export function getEffectivePlan(company) {
  const plan = company?.subscriptionPlan || "free";

  if (
    plan !== "free" &&
    company?.subscriptionExpiresAt &&
    new Date(company.subscriptionExpiresAt) < new Date()
  ) {
    return "free";
  }

  return plan;
}