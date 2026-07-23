import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMySkills,
  addSkill,
  updateSkill,
  deleteSkill,
} from "../controllers/candidateSkillsController.js";

const router = express.Router();

router.get("/", requireAuth, getMySkills);

router.post("/", requireAuth, addSkill);

router.put("/:id", requireAuth, updateSkill);

router.delete("/:id", requireAuth, deleteSkill);

export default router;