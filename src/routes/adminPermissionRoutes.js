// src/routes/adminPermissionRoutes.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireSuperAdmin } from "../middleware/permissions.js";
import { getAllPermissions } from "../controllers/permissionController.js";

const router = express.Router();

// Same policy as roles/sub-admins: only super admin can view the full
// permission catalogue (used to build the role/sub-admin permission picker UI).
router.use(requireAuth, requireSuperAdmin);

router.get("/permissions", getAllPermissions);

export default router;