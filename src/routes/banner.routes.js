import express from "express";
import {
  createBanner,
  getBannersByPlacement,
  getAllBanners,
  updateBanner,
  updateBannerOrder,
  deleteBanner,
  trackImpression,
  trackClick,
  getBannerById,
} from "../controllers/banner.controller.js";

import { requireAuth } from "../middleware/auth.js";
import { requirePermission, requireModule } from "../middleware/permissions.js";

const router = express.Router();

/**
 * =========================
 * PUBLIC ROUTES
 * =========================
 */

// 🔥 SPECIFIC PUBLIC ROUTES FIRST
router.get("/:id/click", trackClick);
router.post("/:id/impression", trackImpression);

// 🔥 THEN GENERIC
router.get("/", getBannersByPlacement);

/**
 * =========================
 * ADMIN ROUTES
 * =========================
 */

// 🔥 MOST SPECIFIC FIRST
router.get("/admin/all", requireAuth, requireModule("banners"), getAllBanners);
router.put("/reorder", requireAuth, requirePermission("banners.edit"), updateBannerOrder);

// 🔥 THEN PARAM ROUTES
router.post("/", requireAuth, requirePermission("banners.create"), createBanner);
router.get("/:id", requireAuth, requireModule("banners"), getBannerById);
router.put("/:id", requireAuth, requirePermission("banners.edit"), updateBanner);
router.delete("/:id", requireAuth, requirePermission("banners.delete"), deleteBanner);

export default router;