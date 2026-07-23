// src/routes/adminSubAdminRoutes.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireSuperAdmin } from "../middleware/permissions.js";
import {
    createSubAdmin,
    getSubAdmins,
    getSubAdminById,
    updateSubAdmin,
    deleteSubAdmin,
    updateSubAdminStatus,
    assignPermissions,
} from "../controllers/subAdminController.js";

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

router.get("/sub-admins", getSubAdmins);
router.post("/sub-admins", createSubAdmin);
router.get("/sub-admins/:id", getSubAdminById);
router.put("/sub-admins/:id", updateSubAdmin);
router.delete("/sub-admins/:id", deleteSubAdmin);
router.patch("/sub-admins/:id/status", updateSubAdminStatus);
router.put("/sub-admins/:id/permissions", assignPermissions); // ✅ was this pointing at updateSubAdminPermissions?

export default router;