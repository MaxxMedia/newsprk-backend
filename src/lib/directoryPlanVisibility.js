import {
  PLAN_COMPANY_PROFILE_LIMITS,
  getManufacturingCapabilitiesConfig,
  getMachineryListConfig,
} from "./packageContentLimits.js";
import { normalizeGalleryArray } from "./galleryUtils.js";

const ARRAY_LIMITS = {
  coverImageUrl: "coverImages",
  productSupplies: "productListings",
  productGallery: "productImages",
  companyGallery: "galleryImages",
  factoryGallery: "factoryImages",
  videoGallery: "productVideos",
  productCatalogues: "productCatalogues",
  brandsRepresented: "brandsRepresented",
  industriesServed: "industriesServed",
};
function array(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value) return [value];
  return [];
}
function limitsFor(plan) {
  const limits = PLAN_COMPANY_PROFILE_LIMITS[plan] || PLAN_COMPANY_PROFILE_LIMITS.free;
  return { ...limits, coverImages: plan === "enterprise" ? 5 : plan === "professional" ? 3 : plan === "basic" ? 1 : 0 };
}
function fieldAccess(plan, limits) {
  const manufacturing = getManufacturingCapabilitiesConfig(plan);
  const machinery = getMachineryListConfig(plan);
  return {
    companyBrochure: limits.brochures,
    certifications: limits.certifications,
    exportMarkets: limits.exportMarkets,
    qualityStandards: limits.qualityStandards,
    enableInquiryForm: plan !== "free",
    manufacturingCapabilities: manufacturing.enabled,
    manufacturingCapabilityImages: manufacturing.hasImages,
    manufacturingCapabilityVideos: manufacturing.hasVideos,
    machineryList: machinery.enabled,
    machineryImages: machinery.hasImages,
  };
}

// Only response copies are reduced; original rows and uploaded files stay intact.
export function directoryForPlan(directory, plan) {
  const limits = limitsFor(plan);
  const visible = { ...directory, socialLinks: { ...(directory.socialLinks || {}) } };
  let hiddenSavedContent = false;
  for (const [field, key] of Object.entries(ARRAY_LIMITS)) {
    const values = field.endsWith("Gallery") && field !== "videoGallery"
      ? normalizeGalleryArray(directory[field])
      : array(directory[field]);
    const limit = limits[key];
    visible[field] = limit === null ? values : values.slice(0, limit);
    hiddenSavedContent ||= visible[field].length < values.length;
  }
  for (const [field, allowed] of Object.entries(fieldAccess(plan, limits))) {
    if (!allowed) {
      const value = directory[field];
      hiddenSavedContent ||= Array.isArray(value) ? value.length > 0 : Boolean(value);
      visible[field] = field === "enableInquiryForm" ? false : Array.isArray(value) ? [] : null;
    }
  }
  if (!limits.whatsapp) {
    hiddenSavedContent ||= Boolean(visible.socialLinks.whatsapp);
    delete visible.socialLinks.whatsapp;
  }
  if (limits.descriptionLimit !== null && typeof directory.description === "string") {
    const words = directory.description.trim().split(/\s+/);
    if (words.length > limits.descriptionLimit) {
      visible.description = words.slice(0, limits.descriptionLimit).join(" ");
      hiddenSavedContent = true;
    }
  }
  visible.isFeatured = Boolean(directory.isFeatured && ["professional", "enterprise"].includes(plan));
  return { ...visible, planTier: plan, hiddenSavedContent };
}

// A save from a reduced editor may change the visible prefix, but must retain
// the hidden remainder. Features unavailable on the plan are left untouched.
export function preserveHiddenDirectoryContent(saved, update, plan) {
  const limits = limitsFor(plan);
  const result = { ...update };
  for (const [field, key] of Object.entries(ARRAY_LIMITS)) {
    if (!(field in result)) continue;
    const limit = limits[key];
    if (limit === null) continue;
    const previous = array(saved[field]);
    if (limit === 0) {
      delete result[field];
      continue;
    }
    const incoming = array(result[field]);
    if (incoming.length > limit) {
      throw Object.assign(new Error("Your current plan allows up to " + limit + " items in " + field + "."), { status: 403, code: "PACKAGE_LIMIT_EXCEEDED" });
    }
    if (previous.length > limit) result[field] = incoming.concat(previous.slice(limit));
  }
  for (const [field, allowed] of Object.entries(fieldAccess(plan, limits))) {
    if (!allowed) delete result[field];
  }
  if (result.socialLinks && !limits.whatsapp) {
    result.socialLinks = { ...result.socialLinks };
    delete result.socialLinks.whatsapp;
    if (saved.socialLinks?.whatsapp) result.socialLinks.whatsapp = saved.socialLinks.whatsapp;
  }
  if (typeof result.description === "string" && limits.descriptionLimit !== null) {
    const incoming = result.description.trim().split(/\s+/);
    const previous = (saved.description || "").trim().split(/\s+/);
    if (incoming.length > limits.descriptionLimit) {
      throw Object.assign(new Error("Your current plan description limit has been reached."), { status: 403, code: "PACKAGE_LIMIT_EXCEEDED" });
    }
    if (previous.length > limits.descriptionLimit) {
      result.description = incoming.concat(previous.slice(limits.descriptionLimit)).join(" ");
    }
  }
  return result;
}
