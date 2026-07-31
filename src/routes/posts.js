// src/routes/posts.js
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
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ================= PUBLIC ROUTES ================= */
router.get("/", getAllPosts);

// ✅ SLUG ROUTES FIRST (VERY IMPORTANT)
router.get("/slug/:slug", getPostBySlug);
router.post("/slug/:slug/view", incrementPostView);
router.post("/:slug/share", incrementPostShare)


// ❗ ID ROUTE AFTER slug routes
router.get("/:id", getPostById);

router.get("/articles/:slug", getRecruiterArticleBySlug);

/* ================= PROTECTED ROUTES ================= */
router.post("/", requireAuth, requireAdmin, createPost);
router.put("/:id", requireAuth, requireAdmin, updatePost);
router.delete("/:id", requireAuth, requireAdmin, deletePost);

export default router;
