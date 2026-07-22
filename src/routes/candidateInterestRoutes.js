import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMyInterests,
  addInterest,
  updateInterest,
  deleteInterest,
} from "../controllers/candidateInterestController.js";

const router = express.Router();

router.get("/", requireAuth, getMyInterests);

router.post("/", requireAuth, addInterest);

router.put("/:id", requireAuth, updateInterest);

router.delete("/:id", requireAuth, deleteInterest);

export default router;