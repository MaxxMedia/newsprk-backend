import express from "express"
import { requireAuth } from "../middleware/auth.js"
import {
  getRecruiterProfile,
  updateRecruiterProfile,
  getMyRecruiterProfile,
  getRecruiterDashboard,
  getRecruitersByCompany,
  getAllRecruiters,
  getCompanyProfileEligibilityController,
} from "../controllers/recruitersController.js"
import { getLeads, downloadLeadsCSV } from "../controllers/Leadcontroller.js"

const router = express.Router()

// 🔐 Logged-in recruiter
router.get("/me", requireAuth, getMyRecruiterProfile)

// 📊 Recruiter dashboard
router.get("/dashboard", requireAuth, getRecruiterDashboard)

// 📥 RFQ Leads (MUST be above /:username, same reason as /admin below)
router.get("/leads", requireAuth, getLeads)
router.get("/leads/download", requireAuth, downloadLeadsCSV)

// ✅ Admin get all recruiters (MOVE THIS UP)
router.get("/admin", requireAuth, getAllRecruiters)

router.get(
  "/company-profile-eligibility",
  requireAuth,
  getCompanyProfileEligibilityController
)

// Company filter
router.get("/", requireAuth, getRecruitersByCompany)


// 🌍 Public recruiter profile (MUST BE LAST)
router.get("/:username", getRecruiterProfile)

// ✏️ Update profile
router.put("/profile", requireAuth, updateRecruiterProfile)

export default router