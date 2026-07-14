import express from "express";
import {
    getAllLeads,
    getLeadById,
    updateLeadStatus,
    deleteLead
} from "../controllers/leadController.js";

const router = express.Router();

// Admin routes (you might want to add authentication middleware here,
// same as the existing admin routes in this project)
router.get("/", getAllLeads);
router.get("/:id", getLeadById);
router.patch("/:id/status", updateLeadStatus);
router.delete("/:id", deleteLead);

export default router;