import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import {
    createWebinar,
    getAdminWebinars,
    getAdminWebinarStats,
    getAdminWebinarById,
    updateWebinar,
    deleteWebinar,
    approveWebinar,
    rejectWebinar,
    publishWebinar,
    draftWebinar,
    toggleFeatureWebinar,
    toggleOnDemandWebinar,
} from "../controllers/Webinarcontroller .js"

const router = Router()

router.get(
    "/admin/webinars",
    requireAuth,
    requireAdmin,
    getAdminWebinars
)

// NOTE: must be registered before "/admin/webinars/:id" or "stats" gets
// swallowed as an :id value
router.get(
    "/admin/webinars/stats",
    requireAuth,
    requireAdmin,
    getAdminWebinarStats
)

router.get(
    "/admin/webinars/:id",
    requireAuth,
    requireAdmin,
    getAdminWebinarById
)

router.post(
    "/admin/webinars",
    requireAuth,
    requireAdmin,
    createWebinar
)

router.put(
    "/admin/webinars/:id",
    requireAuth,
    requireAdmin,
    updateWebinar
)

router.delete(
    "/admin/webinars/:id",
    requireAuth,
    requireAdmin,
    deleteWebinar
)

router.put(
    "/admin/webinars/:id/approve",
    requireAuth,
    requireAdmin,
    approveWebinar
)

router.put(
    "/admin/webinars/:id/reject",
    requireAuth,
    requireAdmin,
    rejectWebinar
)

router.put(
    "/admin/webinars/:id/publish",
    requireAuth,
    requireAdmin,
    publishWebinar
)

router.put(
    "/admin/webinars/:id/draft",
    requireAuth,
    requireAdmin,
    draftWebinar
)

router.put(
    "/admin/webinars/:id/feature",
    requireAuth,
    requireAdmin,
    toggleFeatureWebinar
)

router.put(
    "/admin/webinars/:id/on-demand",
    requireAuth,
    requireAdmin,
    toggleOnDemandWebinar
)

export default router