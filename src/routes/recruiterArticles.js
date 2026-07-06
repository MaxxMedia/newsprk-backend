import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import {
  createRecruiterArticle,
  updateRecruiterArticle,
  deleteRecruiterArticle,
  getMyRecruiterArticles,
  getArticlePostingEligibilityHandler,
} from "../controllers/recruiterArticle.js"

const router = Router()

router.get("/articles/eligibility", requireAuth, getArticlePostingEligibilityHandler)

// ✅ LIST recruiter articles
router.get("/articles", requireAuth, getMyRecruiterArticles)

// ✅ CREATE
router.post("/articles", requireAuth, createRecruiterArticle)

// ✅ UPDATE
router.put("/articles/:id", requireAuth, updateRecruiterArticle)

// ✅ DELETE
router.delete("/articles/:id", requireAuth, deleteRecruiterArticle)

export default router
