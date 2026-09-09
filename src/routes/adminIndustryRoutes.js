import express from "express";
import {
  getIndustryTree,
  getIndustryChildren,
  listIndustries,
  listParentIndustries,
  getIndustryById,
  createIndustry,
  updateIndustry,
  deleteIndustry,
} from "../controllers/adminIndustryController.js";

import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

/* ==============================
   PUBLIC INDUSTRY LOOKUPS
   Mounted at /api
============================== */
export const publicIndustryRouter = express.Router();

publicIndustryRouter.get("/industries", getIndustryTree);
publicIndustryRouter.get("/industries/:id/children", getIndustryChildren);
publicIndustryRouter.post(
  "/industries",
  requireAuth,
  requirePermission("industries.create"),
  createIndustry
);

/* ==============================
   ADMIN INDUSTRIES
   Mounted at /api/admin — must be registered BEFORE routers
   that use router.use(requireAuth) as a catch-all.
============================== */
const router = express.Router();

router.get(
  "/industries",
  requireAuth,
  requirePermission("industries.view"),
  listIndustries
);

router.get(
  "/industries/parents",
  requireAuth,
  requirePermission("industries.view"),
  listParentIndustries
);

router.get(
  "/industries/:id",
  requireAuth,
  requirePermission("industries.view"),
  getIndustryById
);

router.post(
  "/industries",
  requireAuth,
  requirePermission("industries.create"),
  createIndustry
);

router.put(
  "/industries/:id",
  requireAuth,
  requirePermission("industries.edit"),
  updateIndustry
);

router.delete(
  "/industries/:id",
  requireAuth,
  requirePermission("industries.delete"),
  deleteIndustry
);

export default router;
