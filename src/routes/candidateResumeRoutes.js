import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../controllers/uploadController.js";
import {
  uploadResume,
  getMyResume,
  deleteResume,
  getCandidateResume
} from "../controllers/candidateResumeController.js";

const router = express.Router();

router.get(
  "/me",
  requireAuth,
  getMyResume
);

router.post(
  "/upload",
  requireAuth,
  upload.single("resume"),
  uploadResume
);

router.delete(
  "/delete",
  requireAuth,
  deleteResume
);

router.get("/:userId", requireAuth, getCandidateResume);

export default router;