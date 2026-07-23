// src/routes/adminAnalyticsRoutes.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";
import { getAdminAnalytics } from "../controllers/adminAnalyticsController.js";

const router = express.Router();

// ✅ FIX: this route used `requireAdmin` from middleware/auth.js — an
// older, non-RBAC gate that (almost certainly) only accepts the literal
// role "admin" and has no idea `sub_admin` + permissions exist. That's
// why a sub-admin always got a flat 403 here no matter what they were
// granted, while every other /api/admin/* route (activity, roles,
// sub-admins) already uses the RBAC middleware from permissions.js.
//
// requirePermission("analytics.view"):
//   - super_admin / admin -> bypass automatically (SUPER_ROLES check
//     happens first inside requirePermission)
//   - sub_admin -> allowed only if their role or an override grants
//     the "analytics.view" key
//   - deactivated accounts -> blocked even with a valid token
router.get("/analytics", requireAuth, requirePermission("analytics.view"), getAdminAnalytics);

export default router;