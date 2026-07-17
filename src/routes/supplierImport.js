import express from "express";
import multer from "multer";

import { requireAuth, requireAdmin } from "../middleware/auth.js";

import {
  previewSupplierImport,
  getImportBatch,
  getImportBatches,
  executeSupplierImport,
  deleteImportBatch,
  downloadImportTemplate,
  exportFailedRows,
} from "../controllers/supplierImportController.js";

const router = express.Router();

const uploadExcel = multer({
  dest: "uploads/",
});

// Get all import batches
router.get(
  "/",
  requireAuth,
  requireAdmin,
  getImportBatches
);

// Get single batch details
router.get(
  "/:batchId",
  requireAuth,
  requireAdmin,
  getImportBatch
);

// Preview import
router.post(
  "/preview",
  requireAuth,
  requireAdmin,
  uploadExcel.single("file"),
  previewSupplierImport
);

// Execute import
router.post(
  "/execute",
  requireAuth,
  requireAdmin,
  executeSupplierImport
);

// Delete preview batch
router.delete(
  "/:batchId",
  requireAuth,
  requireAdmin,
  deleteImportBatch
);

// Download template
router.get(
  "/template",
  requireAuth,
  requireAdmin,
  downloadImportTemplate
);

// Export failed rows
router.get(
  "/:batchId/export-errors",
  requireAuth,
  requireAdmin,
  exportFailedRows
);

export default router;