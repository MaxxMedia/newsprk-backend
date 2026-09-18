// routes/leadRoutes.js
import express from "express";
import {
    getAllLeads,
    getLeadById,
    updateLeadStatus,
    deleteLead,
    getLeadPackageSummary
} from "../controllers/Leadcontroller.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission, requireModule } from "../middleware/permissions.js";

const router = express.Router();

// All lead routes should be protected
router.get("/", requireAuth, requireModule("leads"), getAllLeads);
router.get("/package-summary", requireAuth, requireModule("leads"), getLeadPackageSummary);
router.get("/:id", requireAuth, requireModule("leads"), getLeadById);
router.patch("/:id/status", requireAuth, requirePermission("leads.edit"), updateLeadStatus);
router.delete("/:id", requireAuth, requirePermission("leads.edit"), deleteLead);

export default router;