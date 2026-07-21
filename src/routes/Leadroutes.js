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

const router = express.Router();

// All lead routes should be protected
router.get("/", requireAuth, getAllLeads);
router.get("/package-summary", requireAuth, getLeadPackageSummary);
router.get("/:id", requireAuth, getLeadById);
router.patch("/:id/status", requireAuth, updateLeadStatus);
router.delete("/:id", requireAuth, deleteLead);

export default router;