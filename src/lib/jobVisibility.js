import { getActiveSubscription } from "./packagePurchases.js";
import { prisma } from "./prisma.js";
import { getJobPostingEligibility, getInternshipPostingEligibility } from "./jobPostingLimits.js";

export async function getCompanyVisibleJobLimit(companyId, prismaClient = prisma) {
  const eligibility = await getJobPostingEligibility(companyId, prismaClient);
  return eligibility.isUnlimited ? null : eligibility.effectiveLimit;
}

async function visibleCompanyJobIds(companyId, client) {
  const [jobs, jobLimit, internships] = await Promise.all([
    client.job.findMany({ where: { companyId, isExternal: false, OR: [{ isActive: true }, { hiddenByPlan: true }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, employmentType: true } }),
    getCompanyVisibleJobLimit(companyId, client),
    getInternshipPostingEligibility(companyId, client),
  ]);
  const internshipLimit = internships.isUnlimited ? null : internships.effectiveLimit;
  const regular = jobs.filter(job => job.employmentType !== "Internship");
  const interns = jobs.filter(job => job.employmentType === "Internship");
  const visible = (jobLimit === null ? regular : regular.slice(0, jobLimit))
    .concat(internshipLimit === null ? interns : interns.slice(0, internshipLimit));
  const ids = visible.map(job => job.id);
  return { ids, hiddenIds: jobs.filter(job => !ids.includes(job.id)).map(job => job.id) };
}

export async function enforceCompanyJobVisibility(companyId, prismaClient = prisma) {
  if (!companyId) return;
  const { ids, hiddenIds } = await visibleCompanyJobIds(companyId, prismaClient);
  if (ids.length) await prismaClient.job.updateMany({ where: { id: { in: ids } }, data: { isActive: true, hiddenByPlan: false } });
  if (hiddenIds.length) await prismaClient.job.updateMany({ where: { id: { in: hiddenIds } }, data: { isActive: false, hiddenByPlan: true } });
}

export async function filterJobsForPackageVisibility(jobs) {
  if (!Array.isArray(jobs) || !jobs.length) return [];
  const companies = [...new Set(jobs.filter(job => !job.isExternal && job.companyId).map(job => job.companyId))];
  const entries = await Promise.all(companies.map(async id => [id, new Set((await visibleCompanyJobIds(id, prisma)).ids)]));
  const plans = new Map(await Promise.all(companies.map(async id => [id, (await getActiveSubscription(id)).plan])));
  const visible = new Map(entries);
  return jobs.filter(job => job.isExternal || (!job.companyId ? job.isActive : visible.get(job.companyId)?.has(job.id)))
    .map(job => job.isExternal ? job : { ...job, isFeatured: Boolean(job.isFeatured && ["professional", "enterprise"].includes(plans.get(job.companyId))) })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function isJobPackageVisible(job) {
  if (!job) return false;
  if (job.isExternal) return true;
  if (!job.companyId) return Boolean(job.isActive);
  return (await visibleCompanyJobIds(job.companyId, prisma)).ids.includes(job.id);
}

export async function enforceAllCompanyJobVisibility() {
  const companies = await prisma.job.findMany({ where: { isExternal: false, companyId: { not: null } }, distinct: ["companyId"], select: { companyId: true } });
  for (const { companyId } of companies) await enforceCompanyJobVisibility(companyId);
}

export async function jobForCurrentPlan(job) {
  if (!job || job.isExternal || !job.companyId) return job;
  const { plan } = await getActiveSubscription(job.companyId);
  return { ...job, isFeatured: Boolean(job.isFeatured && ["professional", "enterprise"].includes(plan)) };
}
