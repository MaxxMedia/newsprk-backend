import express from "express"
import {
  createDirectory,
  approveDirectory,
  updateDirectory,
  getSuppliers,
  getSupplierBySlug,
  getMyDirectories,
  getMyDirectoryById,
  getAllDirectoriesForAdmin,
  trackDirectoryConnection,
  getProductListingEligibilityHandler,
  getSupplierRfqEligibility,
} from "../controllers/supplierDirectoryController.js"

import { createQuoteRequest } from "../controllers/quoteController.js" // ✅ NEW

import { requireAuth, requireAdmin } from "../middleware/auth.js"

const router = express.Router()

// Recruiter
router.post("/", requireAuth, createDirectory)
router.put("/:id", requireAuth, updateDirectory)
router.get(
  "/recruiter/directories",
  requireAuth,
  getMyDirectories
)

router.get(
  "/recruiter/product-listings/eligibility",
  requireAuth,
  getProductListingEligibilityHandler
)

// Admin
router.patch("/admin/:id/approve", requireAuth, requireAdmin, approveDirectory)
// Admin
router.get(
  "/admin",
  requireAuth,
  requireAdmin,
  getAllDirectoriesForAdmin
)

router.post(
  "/:id/connection",
  trackDirectoryConnection
)

// ✅ NEW: Public quote request — matches frontend call to
// POST /api/suppliers/:slug/quote-request
router.post("/:slug/quote-request", createQuoteRequest)

// Recruiter
router.get(
  "/recruiter/directories/:id",
  requireAuth,
  getMyDirectoryById
)

// Public
router.get("/", getSuppliers)
router.get("/:slug/rfq-eligibility", getSupplierRfqEligibility)
router.get("/:slug", getSupplierBySlug)


export default router
