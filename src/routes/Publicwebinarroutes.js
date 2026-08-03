import { Router } from "express"
import {
    getWebinars,
    getFeaturedWebinars,
    getUpcomingWebinars,
    getOnDemandWebinars,
    getWebinarBySlug,
    getRelatedWebinars,
    registerForWebinar,
} from "../controllers/Publicwebinarcontroller.js"

const router = Router()

// NOTE: static paths must be registered before the dynamic "/:slug" route
router.get("/webinars/featured", getFeaturedWebinars)
router.get("/webinars/upcoming", getUpcomingWebinars)
router.get("/webinars/on-demand", getOnDemandWebinars)
router.get("/webinars", getWebinars)

router.get("/webinars/:slug", getWebinarBySlug)
router.get("/webinars/:slug/related", getRelatedWebinars)
router.post("/webinars/:slug/register", registerForWebinar)

export default router