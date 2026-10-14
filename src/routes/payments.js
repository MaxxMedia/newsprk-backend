import { getContentEntitlements } from "../controllers/trialEntitlementsController.js";
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAnyPermission } from "../middleware/permissions.js";
import {
  activateFreePlan,
  createPaymentOrder,
  getAdminPaymentStats,
  getMyPackageInfo,
  verifyPayment,
} from "../controllers/paymentsController.js";

import { activateTrial } from "../controllers/trialsController.js";

const router = express.Router();
router.get("/admin/entitlements", requireAuth, requireAnyPermission(["payments.view", "packages.view", "banners.view", "articles.view"]), getContentEntitlements);
router.post("/start-trial", requireAuth, activateTrial);

router.post("/create-order", requireAuth, createPaymentOrder);
router.post("/verify", requireAuth, verifyPayment);
router.post("/activate-free", requireAuth, activateFreePlan);
router.get("/my-packages", requireAuth, getMyPackageInfo);
router.get(
  "/admin/stats",
  requireAuth,
  requireAnyPermission(["payments.view", "packages.view"]),
  getAdminPaymentStats
);

export default router;