import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMySocials,
  addSocial,
  updateSocial,
  deleteSocial,
} from "../controllers/candidateSocialController.js";

const router = express.Router();

router.get("/", requireAuth, getMySocials);

router.post("/", requireAuth, addSocial);

router.put("/:id", requireAuth, updateSocial);

router.delete("/:id", requireAuth, deleteSocial);

export default router;