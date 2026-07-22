import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  getMyCertifications,
  addCertification,
  updateCertification,
  deleteCertification,
} from "../controllers/candidateCertificationController.js";

const router = express.Router();

router.get("/", requireAuth, getMyCertifications);

router.post("/", requireAuth, addCertification);

router.put("/:id", requireAuth, updateCertification);

router.delete("/:id", requireAuth, deleteCertification);

export default router;