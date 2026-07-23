// src/routes/adminRoleRoutes.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireSuperAdmin } from "../middleware/permissions.js";
import {
    getRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    updateRoleStatus,
    getRolePermissions,
    updateRolePermissions,
} from "../controllers/roleController.js";

const router = express.Router();

// Same policy as sub-admin management: only a top-level SUPER_ADMIN
// (or legacy "admin") can create/edit/delete roles or change what
// permissions a role grants by default.
router.use(requireAuth, requireSuperAdmin);

router.get("/roles", getRoles);
router.post("/roles", createRole);
router.get("/roles/:id/permissions", getRolePermissions);
router.put("/roles/:id/permissions", updateRolePermissions);
router.get("/roles/:id", getRoleById);
router.put("/roles/:id", updateRole);
router.delete("/roles/:id", deleteRole);
router.patch("/roles/:id/status", updateRoleStatus);

export default router;
