import { prisma } from "../lib/prisma.js";
import { getPlanLabel } from "../lib/packagePricing.js";

/**
 * Admin: list companies, optionally filtered by subscription plan.
 *
 * Used for admin dropdowns where a company must be on a specific plan
 * before an action can apply to them — e.g. assigning a plan-gated
 * homepage banner placement like Spotlight / Hero Banner / Sidebar,
 * which only Professional and Enterprise companies are eligible for.
 *
 * Query params:
 *   ?plan=professional              -> only companies on exactly this plan
 *   ?plan=professional,enterprise   -> companies on any of these plans (comma-separated)
 *   ?search=abc                     -> filter by company name (case-insensitive)
 *   (no params)                     -> all companies, each row still includes its plan
 *
 * Route: GET /api/companies/admin/list
 */
export async function getCompaniesForAdmin(req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const { plan, search } = req.query;

    const where = {};

    if (plan) {
      const plans = String(plan)
        .split(",")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean);

      if (plans.length === 1) {
        where.subscriptionPlan = plans[0];
      } else if (plans.length > 1) {
        where.subscriptionPlan = { in: plans };
      }
    }

    if (search) {
      where.name = { contains: String(search), mode: "insensitive" };
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
      },
      orderBy: { name: "asc" },
    });

    // ✅ Return the array directly, not wrapped in an object
    const formatted = companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: c.logoUrl,
      plan: c.subscriptionPlan,
      planLabel: getPlanLabel(c.subscriptionPlan),
      subscriptionExpiresAt: c.subscriptionExpiresAt,
    }));

    res.json(formatted); // Send the array directly
  } catch (err) {
    console.error("Admin get companies error:", err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
}

/**
 * Admin: single company detail with plan info, for a confirmation view
 * before assigning a plan-gated placement.
 *
 * Route: GET /api/companies/admin/:id
 */
export async function getCompanyForAdmin(req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const company = await prisma.company.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
      plan: company.subscriptionPlan,
      planLabel: getPlanLabel(company.subscriptionPlan),
      subscriptionExpiresAt: company.subscriptionExpiresAt,
    });
  } catch (err) {
    console.error("Admin get company error:", err);
    res.status(500).json({ error: "Failed to fetch company" });
  }
}