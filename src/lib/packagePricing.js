const SUBSCRIPTION_PLANS = {
  free: { name: "Free", price: 0, durationDays: null },
  basic: { name: "Basic", price: 1, durationDays: 365 },
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

export function resolvePackage(packageType, packageId) {
  const type = String(packageType || "").toUpperCase();

  if (type === "SUBSCRIPTION") {
    const plan = SUBSCRIPTION_PLANS[packageId];
    if (!plan) return null;
    return {
      packageType: "SUBSCRIPTION",
      packageId,
      packageName: `${plan.name} Subscription`,
      amount: plan.price,
      durationDays: plan.durationDays,
    };
  }

  if (type === "BANNER") {
    const [bannerKey, duration] = String(packageId).split(":");
    const banner = BANNER_PACKAGES[bannerKey];
    if (!banner || !banner[duration]) return null;
    return {
      packageType: "BANNER",
      packageId: `${bannerKey}:${duration}`,
      packageName: `${banner.label} (${duration})`,
      amount: banner[duration],
      durationDays: BANNER_DURATION_DAYS[duration] ?? 30,
      metadata: { bannerKey, duration },
    };
  }

  if (type === "SPONSORED") {
    const pkg = SPONSORED_PACKAGES[packageId];
    if (!pkg) return null;
    return {
      packageType: "SPONSORED",
      packageId,
      packageName: `${pkg.name} Sponsored Content`,
      amount: pkg.price,
      durationDays: null,
    };
  }

  if (type === "RECRUITMENT") {
    const pkg = RECRUITMENT_PACKAGES[packageId];
    if (!pkg) return null;
    return {
      packageType: "RECRUITMENT",
      packageId,
      packageName: pkg.name,
      amount: pkg.price,
      durationDays: pkg.durationDays ?? 30,
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
