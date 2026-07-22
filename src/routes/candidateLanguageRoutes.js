import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMyLanguages,
  addLanguage,
  updateLanguage,
  deleteLanguage,
} from "../controllers/candidateLanguageController.js";

const router = express.Router();

router.get("/", requireAuth, getMyLanguages);

router.post("/", requireAuth, addLanguage);

router.put("/:id", requireAuth, updateLanguage);

router.delete("/:id", requireAuth, deleteLanguage);

export default router;