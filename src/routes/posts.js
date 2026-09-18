import express from "express";
import {
  getAllPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  getRecruiterArticleBySlug,
  incrementPostView,
  incrementPostShare,
  getPopularPosts
} from "../controllers/postsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireModule } from "../middleware/permissions.js";

const router = express.Router();

/* ================= PUBLIC ROUTES ================= */
router.get("/", getAllPosts);

// ✅ SPECIFIC ROUTES FIRST (MORE SPECIFIC)
router.get("/popular", getPopularPosts);  // ← MOVED UP
router.get("/articles/:slug", getRecruiterArticleBySlug);

// ✅ SLUG ROUTES
router.get("/slug/:slug", getPostBySlug);
router.post("/slug/:slug/view", incrementPostView);
router.post("/:slug/share", incrementPostShare);

// ❗ ID ROUTE LAST (MOST GENERAL)
router.get("/:id", getPostById);

/* ================= PROTECTED ROUTES ================= */
router.post("/", requireAuth, requireModule("articles"), createPost);
router.put("/:id", requireAuth, requireModule("articles"), updatePost);
router.delete("/:id", requireAuth, requireModule("articles"), deletePost);

export default router;