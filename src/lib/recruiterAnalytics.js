import { prisma } from "./prisma.js";
import {
  buildMonthlyCount,
  formatStatusLabel,
  getLast6Months,
  toChartSlices,
} from "./analyticsHelpers.js";

function truncateLabel(text, max = 24) {
  if (!text) return "Untitled";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function recruiterArticleWhere(recruiterId, companyId) {
  const base = { category: { slug: "articles" } };
  if (companyId) return { ...base, companyId };
  return { ...base, createdById: recruiterId };
}

function recruiterDirectoryWhere(recruiterId, companyId) {
  if (companyId) {
    return {
      OR: [{ companyId }, { submittedById: recruiterId }],
    };
  }
  return { submittedById: recruiterId };
}

export async function buildRecruiterAnalytics(recruiterId, companyId) {
  const months = getLast6Months();
  const rangeStart = months[0].start;
  const jobWhere = { postedById: recruiterId };
  const applicationWhere = { Job: { postedById: recruiterId } };
  const articleWhere = recruiterArticleWhere(recruiterId, companyId);
  const directoryWhere = recruiterDirectoryWhere(recruiterId, companyId);

  const [
    jobViewsAgg,
    directoryViewsAgg,
    articlesCount,
    directoriesCount,
    applicationsByStatus,
    articlesByStatus,
    directoriesByStatus,
    applicationsInRange,
    jobsInRange,
    jobsWithApplications,
  ] = await Promise.all([
    prisma.job.aggregate({
      where: jobWhere,
      _sum: { views: true },
    }),
    prisma.supplierDirectory.aggregate({
      where: directoryWhere,
      _sum: { views: true },
    }),
    prisma.post.count({ where: articleWhere }),
    prisma.supplierDirectory.count({ where: directoryWhere }),
    prisma.jobApplication.groupBy({
      by: ["status"],
      where: applicationWhere,
      _count: { status: true },
    }),
    prisma.post.groupBy({
      by: ["status"],
      where: articleWhere,
      _count: { status: true },
    }),
    prisma.supplierDirectory.groupBy({
      by: ["status"],
      where: directoryWhere,
      _count: { status: true },
    }),
    prisma.jobApplication.findMany({
      where: { ...applicationWhere, createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.job.findMany({
      where: { ...jobWhere, createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.job.findMany({
      where: jobWhere,
      select: {
        title: true,
        _count: { select: { JobApplication: true } },
      },
    }),
  ]);

  const topJobs = jobsWithApplications
    .sort((a, b) => b._count.JobApplication - a._count.JobApplication)
    .slice(0, 6)
    .map((job) => ({
      name: truncateLabel(job.title),
      applications: job._count.JobApplication,
    }));

  const applicationsByMonth = buildMonthlyCount(months, applicationsInRange);
  const jobsPostedByMonth = buildMonthlyCount(months, jobsInRange);

  const engagementByMonth = months.map((m) => {
    const applications = applicationsInRange.filter((row) => {
      const date = new Date(row.createdAt);
      return date >= m.start && date <= m.end;
    }).length;
    const jobs = jobsInRange.filter((row) => {
      const date = new Date(row.createdAt);
      return date >= m.start && date <= m.end;
    }).length;
    return { month: m.label, applications, jobs: jobs };
  });

  return {
    overview: {
      totalJobViews: jobViewsAgg._sum.views ?? 0,
      totalDirectoryViews: directoryViewsAgg._sum.views ?? 0,
      articlesCount,
      directoriesCount,
    },
    applicationsByStatus: toChartSlices(applicationsByStatus, "status"),
    articlesByStatus: articlesByStatus.map((row) => ({
      name: formatStatusLabel(row.status),
      key: row.status.toLowerCase(),
      value: row._count.status,
    })),
    directoriesByStatus: directoriesByStatus.map((row) => ({
      name: formatStatusLabel(row.status),
      key: row.status.toLowerCase(),
      value: row._count.status,
    })),
    applicationsByMonth,
    jobsPostedByMonth,
    engagementByMonth,
    topJobsByApplications: topJobs,
  };
}
