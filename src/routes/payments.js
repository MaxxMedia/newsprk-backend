import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  activateFreePlan,
  createPaymentOrder,
  getAdminPaymentStats,
  getMyPackageInfo,
  verifyPayment,
} from "../controllers/paymentsController.js";

const router = express.Router();

router.post("/create-order", requireAuth, createPaymentOrder);
router.post("/verify", requireAuth, verifyPayment);
router.post("/activate-free", requireAuth, activateFreePlan);
router.get("/my-packages", requireAuth, getMyPackageInfo);
router.get("/admin/stats", requireAuth, requireAdmin, getAdminPaymentStats);

export default router;
