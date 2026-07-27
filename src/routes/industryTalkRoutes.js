import express from "express";

import { requireAuth } from "../middleware/auth.js";
import { uploadIndustryTalkFiles } from "../middleware/uploadIndustryTalk.js";
import { validateIndustryTalk } from "../validators/industryTalkValidator.js";

import {
  createIndustryTalk,
  updateIndustryTalk,
  deleteIndustryTalk,
  getIndustryTalks,
  getIndustryTalkById,
  getIndustryTalkBySlug,
  publishIndustryTalk,
  saveDraftIndustryTalk,
  incrementIndustryTalkView,
  incrementIndustryTalkShare,
} from "../controllers/industryTalkController.js";

const router = express.Router();

// ==========================
// Public Routes
// ==========================

// Get all Industry Talks
router.get("/", getIndustryTalks);

// Get by slug
router.get("/slug/:slug", getIndustryTalkBySlug);

// Get by ID
router.get("/:id", getIndustryTalkById);

// Increment Views
router.post("/:id/view", incrementIndustryTalkView);

// Increment Shares
router.post("/:id/share", incrementIndustryTalkShare);

// ==========================
// Protected Routes
// ==========================

// Create
router.post(
  "/",
  requireAuth,
  uploadIndustryTalkFiles,
  validateIndustryTalk,
  createIndustryTalk
);

// Update
router.put(
  "/:id",
  requireAuth,
  uploadIndustryTalkFiles,
  validateIndustryTalk,
  updateIndustryTalk
);

// Delete
router.delete(
  "/:id",
  requireAuth,
  deleteIndustryTalk
);

// Publish
router.patch(
  "/:id/publish",
  requireAuth,
  publishIndustryTalk
);

// Save Draft
router.patch(
  "/:id/draft",
  requireAuth,
  saveDraftIndustryTalk
);

export default router;