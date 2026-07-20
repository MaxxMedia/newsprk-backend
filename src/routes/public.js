import { Router } from "express"
import { getApprovedArticles } from "../controllers/publicController.js"
import { getPackages } from "../controllers/adminPackageController.js"

const router = Router()

/**
 * 🌍 PUBLIC ROUTES
 */
router.get("/articles/approved", getApprovedArticles)

/**
 * 🌍 PUBLIC PACKAGES (no auth)
 * Used by the pricing page. getPackages defaults to isActive:true
 * unless ?includeInactive is passed, so this only ever exposes
 * active packages — never gated behind requireAuth/requireAdmin.
 */
router.get("/packages", getPackages)

export default router