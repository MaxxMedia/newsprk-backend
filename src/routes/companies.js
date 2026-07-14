// routes/companies.js
import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import {
  createCompany,
  getAllCompanies,
  getCompanyBySlug,
  verifyCompany,
  getCompanyPeople,
  followCompany,
  unfollowCompany,
  adminCreateCompany,
  getFollowStatus,
  getCompanyTeam,
} from "../controllers/companiesController.js";

const router = express.Router();

// ✅ SEARCH ENDPOINT - MUST BE BEFORE /:slug
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    console.log("🔍 Searching companies for:", q);

    if (!q || q.length < 2) {
      return res.status(200).json([]);
    }

    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { tagline: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        tagline: true,
        isVerified: true,
        description: true,
        location: true,
        Industry: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            User: {
              where: {
                role: 'recruiter',
              },
            },
          },
        },
      },
      take: 20,
      // Sort by: verified first, then companies with recruiters, then by name
      orderBy: [
        { isVerified: 'desc' },
        { name: 'asc' },
      ],
    });

    // Add helper flags for frontend
    const companiesWithFlags = companies.map(company => ({
      ...company,
      hasRecruiter: company._count.User > 0,
      recruiterCount: company._count.User,
    }));

    console.log(`✅ Found ${companies.length} companies for "${q}"`);
    return res.status(200).json(companiesWithFlags);
  } catch (error) {
    console.error("❌ Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search companies",
      error: error.message
    });
  }
});

// Public routes
router.get("/", getAllCompanies);
router.get("/:slug", getCompanyBySlug);
router.get("/:slug/people", getCompanyPeople);
router.get("/:companyId/follow-status", requireAuth, getFollowStatus);
router.get("/:slug/team", getCompanyTeam);

// Follow routes
router.post("/:companyId/follow", requireAuth, followCompany);
router.delete("/:companyId/follow", requireAuth, unfollowCompany);

// Recruiter routes
router.post("/", requireAuth, createCompany);

// Admin routes
router.put("/:id/verify", requireAuth, requireAdmin, verifyCompany);
router.post("/admin-create", requireAuth, adminCreateCompany);

export default router;