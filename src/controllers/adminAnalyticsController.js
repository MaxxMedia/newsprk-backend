// src/controllers/adminAnalyticsController.js

import {prisma} from "../lib/prisma.js";  // ✅ FIXED: Correct import path

// ✅ FIXED: Added missing function inline
function getPlanLabel(planKey) {
  if (!planKey) return "Free";
  const planMap = {
    "free": "Free",
    "basic": "Basic",
    "standard": "Standard",
    "premium": "Premium",
    "enterprise": "Enterprise"
  };
  return planMap[planKey] || planKey.charAt(0).toUpperCase() + planKey.slice(1);
}

function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: start.toLocaleString("en-US", { month: "short" }),
      start,
      end: new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999),
    });
  }
  return months;
}

function buildMonthlyCount(months, records, dateKey = "createdAt") {
  const map = Object.fromEntries(months.map((m) => [m.key, 0]));
  for (const record of records) {
    const date = new Date(record[dateKey]);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (key in map) map[key] += 1;
  }
  return months.map((m) => ({ month: m.label, value: map[m.key] }));
}

function buildMonthlyRevenue(months, purchases) {
  const map = Object.fromEntries(months.map((m) => [m.key, 0]));
  for (const purchase of purchases) {
    const date = new Date(purchase.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (key in map) map[key] += purchase.amount;
  }
  return months.map((m) => ({ month: m.label, revenue: map[m.key] }));
}

function formatRoleLabel(role) {
  if (!role) return "Unknown";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export async function getAdminAnalytics(req, res) {
  try {
    const months = getLast6Months();
    const rangeStart = months[0].start;

    const [
      totalUsers,
      totalCompanies,
      totalJobs,
      activeJobs,
      totalApplications,
      totalPosts,
      totalDirectories,
      totalEvents,
      totalRevenueAgg,
      paidOrders,
      pendingOrders,
      usersByRole,
      plansBreakdown,
      directoryStatus,
      postStatus,
      paymentStatus,
      applicationStatus,
      usersInRange,
      jobsInRange,
      applicationsInRange,
      purchasesInRange,
      recentPurchases,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.job.count(),
      prisma.job.count({ where: { isActive: true } }),
      prisma.jobApplication.count(),
      prisma.post.count(),
      prisma.supplierDirectory.count(),
      prisma.event.count(),
      prisma.packagePurchase.aggregate({
        where: { status: "PAID" },
        _sum: { amount: true },
      }),
      prisma.packagePurchase.count({ where: { status: "PAID" } }),
      prisma.packagePurchase.count({ where: { status: "PENDING" } }),
      prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
      // ✅ FIXED: Handle null subscriptionPlan values
      prisma.company.groupBy({
        by: ["subscriptionPlan"],
        _count: { subscriptionPlan: true },
      }),
      prisma.supplierDirectory.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.post.groupBy({ by: ["status"], _count: { status: true } }),
      prisma.packagePurchase.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.jobApplication.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { createdAt: true },
      }),
      prisma.job.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { createdAt: true },
      }),
      prisma.jobApplication.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { createdAt: true },
      }),
      prisma.packagePurchase.findMany({
        where: { status: "PAID", createdAt: { gte: rangeStart } },
        select: { createdAt: true, amount: true },
      }),
      prisma.packagePurchase.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          User: { select: { email: true, fullName: true } },
          Company: { select: { name: true } },
        },
      }),
    ]);

    const growthChart = months.map((m) => {
      const userCount = usersInRange.filter((u) => {
        const d = new Date(u.createdAt);
        return d >= m.start && d <= m.end;
      }).length;
      const jobCount = jobsInRange.filter((j) => {
        const d = new Date(j.createdAt);
        return d >= m.start && d <= m.end;
      }).length;
      const applicationCount = applicationsInRange.filter((a) => {
        const d = new Date(a.createdAt);
        return d >= m.start && d <= m.end;
      }).length;

      return {
        month: m.label,
        users: userCount,
        jobs: jobCount,
        applications: applicationCount,
      };
    });

    // ✅ FIXED: Handle null subscriptionPlan values safely
    const subscriptionPlans = plansBreakdown
      .filter(row => row.subscriptionPlan !== null)
      .map((row) => ({
        name: getPlanLabel(row.subscriptionPlan),
        key: row.subscriptionPlan || "free",
        value: row._count.subscriptionPlan,
      }));

    res.json({
      overview: {
        totalUsers,
        totalCompanies,
        totalJobs,
        activeJobs,
        totalApplications,
        totalPosts,
        totalDirectories,
        totalEvents,
        totalRevenue: totalRevenueAgg._sum.amount ?? 0,
        paidOrders,
        pendingOrders,
      },
      usersByRole: usersByRole.map((row) => ({
        name: formatRoleLabel(row.role),
        key: row.role || "unknown",
        value: row._count.role,
      })),
      subscriptionPlans: subscriptionPlans,
      directoryStatus: directoryStatus.map((row) => ({
        name: row.status,
        key: row.status.toLowerCase(),
        value: row._count.status,
      })),
      postStatus: postStatus.map((row) => ({
        name: row.status,
        key: row.status.toLowerCase(),
        value: row._count.status,
      })),
      paymentStatus: paymentStatus.map((row) => ({
        name: row.status,
        key: row.status.toLowerCase(),
        value: row._count.status,
      })),
      applicationStatus: applicationStatus.map((row) => ({
        name: row.status,
        key: row.status.toLowerCase(),
        value: row._count.status,
      })),
      revenueByMonth: buildMonthlyRevenue(months, purchasesInRange),
      newUsersByMonth: buildMonthlyCount(months, usersInRange),
      growthByMonth: growthChart,
      recentPurchases,
    });
  } catch (err) {
    // ✅ FIXED: Proper error logging without leaking internals
    console.error("Admin analytics error:", err);
    res.status(500).json({
      error: "Failed to load analytics",
      // In production, just send the error message
      message: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
}