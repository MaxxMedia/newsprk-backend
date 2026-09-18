import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireAnyPermission } from "../middleware/permissions.js";
import {
  getCompaniesForAdmin,
  getCompanyForAdmin,
} from "../controllers/adminCompaniesController.js";

const router = express.Router();

// GET /api/admin/companies            -> list, optional ?plan= and ?search=
// GET /api/admin/companies/:id        -> single company detail
router.get(
  "/",
  requireAuth,
  requireAnyPermission(["companies.view", "banners.view", "banners.create", "banners.edit"]),
  getCompaniesForAdmin
);
router.get(
  "/:id",
  requireAuth,
  requireAnyPermission(["companies.view", "banners.view", "banners.create", "banners.edit"]),
  getCompanyForAdmin
);

export default router;