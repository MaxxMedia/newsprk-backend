import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getAdminAnalytics } from "../controllers/adminAnalyticsController.js";

const router = express.Router();

router.get("/analytics", requireAuth, requireAdmin, getAdminAnalytics);

export default router;
