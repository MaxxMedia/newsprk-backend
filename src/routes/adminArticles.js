// import { Router } from "express"
// import { requireAuth, requireAdmin } from "../middleware/auth.js"
// import {
//   getPendingArticles,
//   approveArticle,
//   rejectArticle,
//   getAdminApprovedArticles
// } from "../controllers/adminArticlesController.js"

// const router = Router()

// router.get("/articles/pending", requireAuth, requireAdmin, getPendingArticles)

// router.get(
//   "/articles/adminapproved",
//   requireAuth,
//   getAdminApprovedArticles
// )
// router.put("/articles/:id/approve", requireAuth, requireAdmin, approveArticle)
// router.put("/articles/:id/reject", requireAuth, requireAdmin, rejectArticle)

// export default router


import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { requirePermission, requireModule } from "../middleware/permissions.js"
import {
  getPendingArticles,
  approveArticle,
  rejectArticle,
  getAdminApprovedArticles
} from "../controllers/adminArticlesController.js"

const router = Router()

router.get(
  "/articles/pending",
  requireAuth,
  requireModule("articles"),
  getPendingArticles
)

router.get(
  "/articles/adminapproved",
  requireAuth,
  requireModule("articles"),
  getAdminApprovedArticles
)

router.put(
  "/articles/:id/approve",
  requireAuth,
  requireModule("articles"),
  approveArticle
)

router.put(
  "/articles/:id/reject",
  requireAuth,
  requireModule("articles"),
  rejectArticle
)

export default router