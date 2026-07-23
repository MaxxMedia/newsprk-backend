// src/routes/adminPackageRoutes.js
// (updated — only the middleware chain per route changed; controllers untouched)
console.log("🔵 adminPackageRoutes.js loaded!");

import express from "express";
import {
    getPackages,
    getPackageById,
    upsertPackage,
    deletePackage,
    togglePackageStatus,
    getAllCompaniesWithUsage,
    getCompanyUsageDetails,
    getPlatformStats,
} from "../controllers/adminPackageController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

const router = express.Router();

// =====================
// PACKAGE MANAGEMENT
// =====================

// Get all packages (merges DB overrides with fallback)
router.get("/packages", requireAuth, requirePermission("packages.view"), getPackages);

// Get single package
router.get("/packages/:id", requireAuth, requirePermission("packages.view"), getPackageById);

// Create or update package (upsert) — kept SUPER_ADMIN/legacy-admin-only
// via requireAdmin since package pricing is a sensitive, non-delegated
// action; swap for requirePermission("packages.edit") if you want this
// delegable to sub-admins too (add "packages.edit" / "packages.create"
// to src/lib/permissions.js first).
router.post("/packages", requireAuth, requireAdmin, upsertPackage);

// Delete package (soft delete)
router.delete("/packages/:id", requireAuth, requireAdmin, deletePackage);

// Toggle package status
router.patch("/packages/:id/toggle", requireAuth, requireAdmin, togglePackageStatus);

// =====================
// COMPANY USAGE
// =====================
router.get("/companies", requireAuth, requirePermission("companies.view"), getAllCompaniesWithUsage);
router.get("/companies/:id", requireAuth, requirePermission("companies.view"), getCompanyUsageDetails);

// =====================
// PLATFORM STATS
// =====================
router.get("/stats", requireAuth, requirePermission("analytics.view"), getPlatformStats);

console.log("✅ Admin package routes registered (RBAC-protected)");

export default router;