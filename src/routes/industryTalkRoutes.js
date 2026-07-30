// routes/industryTalks.js

import express from "express";

import { requireAuth } from "../middleware/auth.js";
import { uploadIndustryTalkFiles } from "../middleware/uploadIndustryTalk.js";
import { validateIndustryTalk } from "../../validators/industryTalkValidator.js";

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
  incrementIndustryTalkViewBySlug, // 👈 ADD THIS
  incrementIndustryTalkShare,
} from "../controllers/industryTalkController.js";

const router = express.Router();

// ==========================
// Public Routes
// ==========================

// Get all Industry Talks
router.get("/", getIndustryTalks);

// IMPORTANT: Slug route MUST come BEFORE the ID route
// Get by slug (more specific first)
router.get("/slug/:slug", getIndustryTalkBySlug);

// 👇 ADD THIS - Increment Views by slug (for frontend)
router.post("/slug/:slug/view", incrementIndustryTalkViewBySlug);

// Get by ID (less specific, should come after slug)
router.get("/:id", getIndustryTalkById);

// Increment Views (POST routes) - by ID
router.post("/:id/view", incrementIndustryTalkView);

// Increment Shares (POST routes)
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