import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../controllers/uploadController.js";
import {
  applyJob,
  getMyApplications,
  getApplicantsByJob,
  getApplicationById,
  updateApplicationStatus,
} from "../controllers/jobApplicationsController.js";

const router = express.Router();

router.post(
  "/",
  requireAuth,
  upload.single("resume"),
  applyJob
);

router.get("/me", requireAuth, getMyApplications);

router.get("/job/:jobId", requireAuth, getApplicantsByJob);

router.get("/:applicationId", requireAuth, getApplicationById);

router.put("/:applicationId/status", requireAuth, updateApplicationStatus);

export default router;