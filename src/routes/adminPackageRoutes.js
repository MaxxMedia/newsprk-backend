import express from "express";
import {
    getAllCompaniesWithUsage,
    getCompanyUsageDetails,
    getPlatformStats,
} from "../controllers/adminPackageController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Get all companies with usage data
router.get("/companies", requireAuth, requireAdmin, getAllCompaniesWithUsage);

// Get single company usage details
router.get("/companies/:id", requireAuth, requireAdmin, getCompanyUsageDetails);

// Get platform stats
router.get("/stats", requireAuth, requireAdmin, getPlatformStats);

export default router;