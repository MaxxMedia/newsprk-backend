import express from "express"
import { requireAuth } from "../middleware/auth.js"
import { getRecruiterDashboard } from "../controllers/recruiterDashboardController.js"

const router = express.Router()

router.get("/dashboard", requireAuth, async (req, res, next) => {
    try {
        await getRecruiterDashboard(req, res, next)
    } catch (err) {
        console.error("🔴 Dashboard route crashed:", err)
        if (!res.headersSent) {
            res.status(500).json({ error: err.message || "Failed to load dashboard" })
        }
    }
})

export default router