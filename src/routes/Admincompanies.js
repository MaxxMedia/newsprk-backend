import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import {
  getCompaniesForAdmin,
  getCompanyForAdmin,
} from "../controllers/adminCompaniesController.js";

const router = express.Router();

// GET /api/admin/companies            -> list, optional ?plan= and ?search=
// GET /api/admin/companies/:id        -> single company detail
router.get("/", requireAuth, requireAdmin, getCompaniesForAdmin);
router.get("/:id", requireAuth, requireAdmin, getCompanyForAdmin);

export default router;