// src/routes/adminPackageRoutes.js
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

const router = express.Router();

// =====================
// PACKAGE MANAGEMENT
// =====================

// Get all packages (merges DB overrides with fallback)
router.get("/packages", requireAuth, requireAdmin, getPackages);

// Get single package
router.get("/packages/:id", requireAuth, requireAdmin, getPackageById);

// Create or update package (upsert)
router.post("/packages", requireAuth, requireAdmin, upsertPackage);

// Delete package (soft delete)
router.delete("/packages/:id", requireAuth, requireAdmin, deletePackage);

// Toggle package status
router.patch("/packages/:id/toggle", requireAuth, requireAdmin, togglePackageStatus);

// =====================
// COMPANY USAGE
// =====================
router.get("/companies", requireAuth, requireAdmin, getAllCompaniesWithUsage);
router.get("/companies/:id", requireAuth, requireAdmin, getCompanyUsageDetails);

// =====================
// PLATFORM STATS
// =====================
router.get("/stats", requireAuth, requireAdmin, getPlatformStats);

console.log("✅ Admin package routes registered");
console.log("  - GET /api/admin/packages");
console.log("  - GET /api/admin/packages/:id");
console.log("  - POST /api/admin/packages");
console.log("  - PUT /api/admin/packages/:id");
console.log("  - DELETE /api/admin/packages/:id");
console.log("  - PATCH /api/admin/packages/:id/toggle");

export default router;