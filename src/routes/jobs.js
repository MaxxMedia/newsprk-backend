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
  getJobById,
updateJob,
} from "../controllers/jobsController.js"
import {
  getMySavedJobs,
  saveJob,
  unsaveJob,
  getSaveStatus,
} from "../controllers/savedJobsController.js"

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

// Get single recruiter job
router.get(
  "/recruiter/me/:id",
  requireAuth,
  getJobById
);

// Update recruiter job
router.put(
  "/:id",
  requireAuth,
  updateJob
);

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

/* ================= CANDIDATE ================= */

router.get("/saved/me", requireAuth, getMySavedJobs)
router.get("/:jobId/save-status", requireAuth, getSaveStatus)
router.post("/:jobId/save", requireAuth, saveJob)
router.delete("/:jobId/save", requireAuth, unsaveJob)

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