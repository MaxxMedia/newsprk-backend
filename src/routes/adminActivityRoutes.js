// src/routes/adminActivityRoutes.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, requireSuperAdmin } from "../middleware/permissions.js";
import { getActivity, getActivitySummary } from "../controllers/activityController.js";

const router = express.Router();

router.use(requireAuth);

// Anyone with settings.view (or a super admin) can see the activity feed —
// adjust the permission key here if you'd rather gate it more tightly.
router.get("/activity", requirePermission("settings.view"), getActivity);
router.get("/activity/summary", requireSuperAdmin, getActivitySummary);

export default router;
