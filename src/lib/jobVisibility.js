import { prisma } from "./prisma.js";
import { getJobPostingEligibility } from "./jobPostingLimits.js";

export async function getCompanyVisibleJobLimit(companyId) {
  const eligibility = await getJobPostingEligibility(companyId);

  if (eligibility.isUnlimited) {
    return null;
  }

  return eligibility.effectiveLimit;
}

export async function enforceCompanyJobVisibility(companyId) {
  if (!companyId) return;

  const limit = await getCompanyVisibleJobLimit(companyId);

  const companyJobs = await prisma.job.findMany({
    where: {
      companyId,
      isExternal: false,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (limit === null) {
    if (companyJobs.length > 0) {
      await prisma.job.updateMany({
        where: { id: { in: companyJobs.map((job) => job.id) } },
        data: { isActive: true },
      });
    }
    return;
  }

  const visibleIds = companyJobs.slice(0, limit).map((job) => job.id);
  const hiddenIds = companyJobs.slice(limit).map((job) => job.id);

  if (visibleIds.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: visibleIds } },
      data: { isActive: true },
    });
  }

  if (hiddenIds.length > 0) {
    await prisma.job.updateMany({
      where: { id: { in: hiddenIds } },
      data: { isActive: false },
    });
  }
}

export async function filterJobsForPackageVisibility(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return [];
  }

  const externalJobs = jobs.filter((job) => job.isExternal);
  const internalJobs = jobs.filter((job) => !job.isExternal && job.companyId);

  const jobsByCompany = internalJobs.reduce((groups, job) => {
    const key = String(job.companyId);
    if (!groups[key]) groups[key] = [];
    groups[key].push(job);
    return groups;
  }, {});

  const visibleInternalJobs = [];

  for (const [companyId, companyJobs] of Object.entries(jobsByCompany)) {
    const limit = await getCompanyVisibleJobLimit(Number(companyId));
    const sortedJobs = [...companyJobs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (limit === null) {
      visibleInternalJobs.push(...sortedJobs);
    } else {
      visibleInternalJobs.push(...sortedJobs.slice(0, limit));
    }
  }

  return [...externalJobs, ...visibleInternalJobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function isJobPackageVisible(job) {
  if (!job || job.isExternal) {
    return true;
  }

  if (!job.companyId) {
    return Boolean(job.isActive);
  }

  const limit = await getCompanyVisibleJobLimit(job.companyId);
  if (limit === null) {
    return true;
  }

  const companyJobs = await prisma.job.findMany({
    where: {
      companyId: job.companyId,
      isExternal: false,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
    take: limit,
  });

  return companyJobs.some((entry) => entry.id === job.id);
}

export async function enforceAllCompanyJobVisibility() {
  const companies = await prisma.job.findMany({
    where: {
      isExternal: false,
      companyId: { not: null },
    },
    distinct: ["companyId"],
    select: { companyId: true },
  });

  for (const { companyId } of companies) {
    await enforceCompanyJobVisibility(companyId);
  }
}
