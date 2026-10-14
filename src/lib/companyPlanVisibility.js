import { prisma } from "./prisma.js";
import { getActiveSubscription, getActivePackagePurchases } from "./packagePurchases.js";
import { PLAN_PRODUCT_LISTING_LIMITS, PLAN_ARTICLE_LIMITS, PLAN_TEAM_MEMBER_LIMITS } from "./packageContentLimits.js";

export async function limitCompanyRows(rows, companyId, kind, client = prisma) {
  const { plan } = await getActiveSubscription(companyId, client);
  const table = kind === "articles" ? PLAN_ARTICLE_LIMITS : kind === "team" ? PLAN_TEAM_MEMBER_LIMITS : PLAN_PRODUCT_LISTING_LIMITS;
  const limit = Object.hasOwn(table, plan) ? table[plan] : table.free;
  if (limit === null) return rows;
  if (kind !== "articles") return rows.slice(0, limit);
  const counts = new Map();
  return rows.filter(row => {
    const year = new Date(row.createdAt || Date.now()).getUTCFullYear();
    const used = counts.get(year) || 0;
    counts.set(year, used + 1);
    return used < limit;
  });
}

export async function hiddenDirectoryIds(client = prisma) {
  const rows = await client.supplierDirectory.findMany({
    select: { id: true, companyId: true, User_SupplierDirectory_submittedByIdToUser: { select: { companyId: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const groups = new Map();
  for (const row of rows) {
    const companyId = row.companyId ?? row.User_SupplierDirectory_submittedByIdToUser?.companyId;
    if (!companyId) continue;
    if (!groups.has(companyId)) groups.set(companyId, []);
    groups.get(companyId).push(row);
  }
  return (await Promise.all([...groups].map(async ([id, entries]) => {
    const visible = await limitCompanyRows(entries, id, "directories", client);
    return entries.slice(visible.length).map(row => row.id);
  }))).flat();
}

export async function addonPurchaseHasAccess(purchase, client = prisma, now = new Date()) {
  if (!purchase?.companyId) return false;
  const active = await getActivePackagePurchases(purchase.companyId, client, now);
  return active.some(row => row.packageType === purchase.packageType && (purchase.packageType === "BANNER"
    ? row.packageId.split(":")[0] === purchase.packageId.split(":")[0]
    : row.packageId === purchase.packageId));
}

export async function validateContentPurchase(id, type, client = prisma) {
  if (id == null || id === "") return null;
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) throw Object.assign(new Error("Invalid company package"), { status: 400 });
  const purchase = await client.packagePurchase.findUnique({ where: { id: Number(id) } });
  if (!purchase || !purchase.companyId || purchase.packageType !== type || !["PAID", "TRIAL"].includes(purchase.status)) {
    throw Object.assign(new Error("Choose an active company " + type.toLowerCase() + " package."), { status: 400 });
  }
  return purchase;
}

// Apply the filter before pagination so hidden content doesn't leave short pages.
export async function hiddenPostIds(client = prisma) {
  const rows = await client.post.findMany({
    where: { OR: [{ companyId: { not: null } }, { packagePurchaseId: { not: null } }] },
    select: { id: true, createdAt: true, companyId: true, packagePurchaseId: true, PackagePurchase: true, User_Post_createdByIdToUser: { select: { role: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  const hidden = [], groups = new Map();
  const access = new Map();
  for (const row of rows) {
    if (row.packagePurchaseId) {
      if (!access.has(row.packagePurchaseId)) access.set(row.packagePurchaseId, await addonPurchaseHasAccess(row.PackagePurchase, client));
      if (!access.get(row.packagePurchaseId)) hidden.push(row.id);
    } else if (row.companyId && row.User_Post_createdByIdToUser?.role === "recruiter") {
      if (!groups.has(row.companyId)) groups.set(row.companyId, []);
      groups.get(row.companyId).push(row);
    }
  }
  const companyHidden = await Promise.all([...groups].map(async ([id, entries]) => {
    const visible = await limitCompanyRows(entries, id, "articles", client);
    const visibleIds = new Set(visible.map(row => row.id));
    return entries.filter(row => !visibleIds.has(row.id)).map(row => row.id);
  }));
  return hidden.concat(companyHidden.flat());
}

export async function featuredSupplierIds(client = prisma) {
  const rows = await client.supplierDirectory.findMany({
    where: { isFeatured: true, status: "APPROVED" },
    select: { id: true, companyId: true, User_SupplierDirectory_submittedByIdToUser: { select: { companyId: true } } },
  });
  const plans = new Map();
  const result = [];
  for (const row of rows) {
    const id = row.companyId ?? row.User_SupplierDirectory_submittedByIdToUser?.companyId;
    if (!plans.has(id)) plans.set(id, getActiveSubscription(id, client));
    if (["professional", "enterprise"].includes((await plans.get(id)).plan)) result.push(row.id);
  }
  return result;
}
