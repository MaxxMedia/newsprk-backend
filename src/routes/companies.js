import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  createCompany,
  getAllCompanies,
  getCompanyBySlug,
  verifyCompany,
  getCompanyPeople,
  followCompany,
  unfollowCompany,
  adminCreateCompany, // ✅ ADD COMMA HERE
  getFollowStatus,
  getCompanyTeam,
} from "../controllers/companiesController.js";

const router = express.Router();

// Public
router.get("/", getAllCompanies);
router.get("/:slug", getCompanyBySlug);
router.get("/:slug/people", getCompanyPeople);
router.get("/:companyId/follow-status", requireAuth, getFollowStatus);
router.get("/:slug/team", getCompanyTeam);

router.post("/:companyId/follow", requireAuth, followCompany);
router.delete("/:companyId/follow", requireAuth, unfollowCompany);

// Recruiter
router.post("/", requireAuth, createCompany);

// Admin
router.put("/:id/verify", requireAuth, requireAdmin, verifyCompany);
router.post("/admin-create", requireAuth, adminCreateCompany);

export default router;