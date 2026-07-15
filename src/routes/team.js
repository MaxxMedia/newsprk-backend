// routes/team.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  requestToJoinCompany,
  getMyTeamMembership,
  getPendingRequests,
  approveTeamMember,
  rejectTeamMember,
  getCompanyTeamMembers,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  searchCandidates,
  getTeamMemberDetails,
} from "../controllers/teamController.js";

const router = express.Router();

// Existing routes
router.post("/request", requireAuth, requestToJoinCompany);
router.get("/me", requireAuth, getMyTeamMembership);
router.get("/pending", requireAuth, getPendingRequests);
router.get("/members", requireAuth, getCompanyTeamMembers);
router.patch("/:id/approve", requireAuth, approveTeamMember);
router.patch("/:id/reject", requireAuth, rejectTeamMember);

// NEW: Add team member directly
router.post("/add", requireAuth, addTeamMember);

// NEW: Update team member
router.patch("/:id", requireAuth, updateTeamMember);

// NEW: Remove team member (mark as FORMER)
router.patch("/:id/remove", requireAuth, removeTeamMember);

// NEW: Get team member details
router.get("/:id", requireAuth, getTeamMemberDetails);

// NEW: Search candidates
router.get("/candidates/search", requireAuth, searchCandidates);

// Debug endpoints
router.get("/debug/all-pending", requireAuth, async (req, res) => {
  try {
    const { prisma } = await import("../lib/prisma.js");
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });

    if (!['admin', 'recruiter'].includes(user?.role || '')) {
      return res.status(403).json({ error: "Access denied" });
    }

    const allRequests = await prisma.companyTeamMember.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true,
          }
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      total: allRequests.length,
      requests: allRequests
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

router.get("/debug/recruiter-company", requireAuth, async (req, res) => {
  try {
    const { prisma } = await import("../lib/prisma.js");
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    });

    return res.json({
      user,
      hasCompany: !!user?.companyId,
      companyName: user?.company?.name || 'No company'
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;