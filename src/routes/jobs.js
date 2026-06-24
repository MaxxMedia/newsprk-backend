import express from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import {
  createJob,
  getAllJobs,
  getJobBySlug,
  deactivateJob,
  getJobsByRecruiter,
  getMyRecruiterJobs,
  getAdminCompanyJobs,
  incrementJobView,
} from "../controllers/jobsController.js"

const router = express.Router()

/* ================= PUBLIC ================= */

// All jobs
router.get("/", getAllJobs)

/* ================= RECRUITER ================= */

// Recruiter's own jobs
router.get(
  "/recruiter/me",
  requireAuth,
  getMyRecruiterJobs
)

// Public recruiter profile jobs
router.get(
  "/recruiter/:username",
  getJobsByRecruiter
)

// Create job
router.post(
  "/",
  requireAuth,
  createJob
)

/* ================= ADMIN ================= */

// Company-wise jobs
router.get(
  "/admin/company-jobs",
  requireAuth,
  requireAdmin,
  getAdminCompanyJobs
)

// Deactivate job
router.put(
  "/:id/deactivate",
  requireAuth,
  requireAdmin,
  deactivateJob
)

/* ================= JOB ACTIONS ================= */

// Increment job view
router.post(
  "/:slug/view",
  incrementJobView
)

// ⚠️ KEEP THIS LAST
router.get(
  "/:slug",
  getJobBySlug
)

export default router