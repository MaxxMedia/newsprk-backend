import express from "express";
import { uploadImage } from "../controllers/uploadController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAnyPermission } from "../middleware/permissions.js";

const router = express.Router();

/**
 * ADMIN – Upload Advertisement Banner Image
 */
router.post(
  "/upload",
  requireAuth,
  requireAnyPermission(["banners.create", "banners.edit"]),
  uploadImage
);

export default router;
