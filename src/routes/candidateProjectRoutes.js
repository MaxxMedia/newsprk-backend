import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMyProjects,
  addProject,
  updateProject,
  deleteProject,
} from "../controllers/candidateProjectController.js";

const router = express.Router();

router.get("/", requireAuth, getMyProjects);

router.post("/", requireAuth, addProject);

router.put("/:id", requireAuth, updateProject);

router.delete("/:id", requireAuth, deleteProject);

export default router;