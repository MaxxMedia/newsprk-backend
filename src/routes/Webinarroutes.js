import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { requirePermission, requireModule } from "../middleware/permissions.js"
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
    requireModule("webinar"),
    getAdminWebinars
)

// NOTE: must be registered before "/admin/webinars/:id" or "stats" gets
// swallowed as an :id value
router.get(
    "/admin/webinars/stats",
    requireAuth,
    requireModule("webinar"),
    getAdminWebinarStats
)

router.get(
    "/admin/webinars/:id",
    requireAuth,
    requireModule("webinar"),
    getAdminWebinarById
)

router.post(
    "/admin/webinars",
    requireAuth,
    requireModule("webinar"),
    createWebinar
)

router.put(
    "/admin/webinars/:id",
    requireAuth,
    requireModule("webinar"),
    updateWebinar
)

router.delete(
    "/admin/webinars/:id",
    requireAuth,
    requireModule("webinar"),
    deleteWebinar
)

router.put(
    "/admin/webinars/:id/approve",
    requireAuth,
    requireModule("webinar"),
    approveWebinar
)

router.put(
    "/admin/webinars/:id/reject",
    requireAuth,
    requireModule("webinar"),
    rejectWebinar
)

router.put(
    "/admin/webinars/:id/publish",
    requireAuth,
    requireModule("webinar"),
    publishWebinar
)

router.put(
    "/admin/webinars/:id/draft",
    requireAuth,
    requireModule("webinar"),
    draftWebinar
)

router.put(
    "/admin/webinars/:id/feature",
    requireAuth,
    requireModule("webinar"),
    toggleFeatureWebinar
)

router.put(
    "/admin/webinars/:id/on-demand",
    requireAuth,
    requireModule("webinar"),
    toggleOnDemandWebinar
)

export default router