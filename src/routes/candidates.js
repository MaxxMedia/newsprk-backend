import express from "express"
import {
  getCandidateProfile,
  getMyCandidateProfile,
  onboardCandidate,
  updateCandidateProfile,
} from "../controllers/candidatesController.js"
import { getApplicationReadiness } from "../controllers/candidateApplicationController.js"

import { requireAuth } from "../middleware/auth.js"

const router = express.Router()

router.get("/me", requireAuth, getMyCandidateProfile)
router.put("/me", requireAuth, updateCandidateProfile)

router.post("/onboarding", requireAuth, onboardCandidate)

// ⚠️ Keep LAST
router.get("/:username", getCandidateProfile)
router.get("/me/application-readiness", requireAuth, getApplicationReadiness)

export default router