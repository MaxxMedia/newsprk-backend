import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMyExperience,
  addExperience,
  updateExperience,
  deleteExperience,
} from "../controllers/candidateExperienceController.js";

const router = express.Router();

router.get("/", requireAuth, getMyExperience);

router.post("/", requireAuth, addExperience);

router.put("/:id", requireAuth, updateExperience);

router.delete("/:id", requireAuth, deleteExperience);

export default router;