import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMyAchievements,
  addAchievement,
  updateAchievement,
  deleteAchievement,
} from "../controllers/candidateAchievementController.js";

const router = express.Router();

router.get("/", requireAuth, getMyAchievements);

router.post("/", requireAuth, addAchievement);

router.put("/:id", requireAuth, updateAchievement);

router.delete("/:id", requireAuth, deleteAchievement);

export default router;