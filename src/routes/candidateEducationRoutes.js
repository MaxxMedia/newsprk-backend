import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMyEducation,
  addEducation,
  updateEducation,
  deleteEducation,
} from "../controllers/candidateEducationController.js";

const router = express.Router();

router.get("/", requireAuth, getMyEducation);

router.post("/", requireAuth, addEducation);

router.put("/:id", requireAuth, updateEducation);

router.delete("/:id", requireAuth, deleteEducation);

export default router;