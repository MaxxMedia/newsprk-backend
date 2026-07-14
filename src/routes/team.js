import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  requestToJoinCompany,
  getMyTeamMembership,
  getPendingRequests,
  approveTeamMember,
  rejectTeamMember,
  getCompanyTeamMembers,
} from "../controllers/teamController.js";

const router = express.Router();

router.post("/request", requireAuth, requestToJoinCompany);

router.get("/me", requireAuth, getMyTeamMembership);

router.get("/pending", requireAuth, getPendingRequests);

router.get(
  "/members",
  requireAuth,
  getCompanyTeamMembers
);
router.patch(
  "/:id/approve",
  requireAuth,
  approveTeamMember
);

router.patch(
  "/:id/reject",
  requireAuth,
  rejectTeamMember
);
// routes/team.js - Add these debug endpoints

// Debug: Check all pending requests (admin only)
// routes/team.js - Add this debug endpoint

router.get("/debug/all-pending", requireAuth, async (req, res) => {
  try {
    // Check if user is admin or recruiter
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

// Debug: Check recruiter's company
router.get("/debug/recruiter-company", requireAuth, async (req, res) => {
  try {
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