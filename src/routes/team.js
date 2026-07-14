import express from "express";
import { requireAuth } from "../middleware/auth.js";

import {
  requestToJoinCompany,
  getMyTeamMembership,
  getPendingRequests,
  approveTeamMember,
  rejectTeamMember,
  getCompanyTeamMembers,
} from "../controllers/teamController.js";

const router = express.Router();

router.post("/request", requireAuth, requestToJoinCompany);

router.get("/me", requireAuth, getMyTeamMembership);

router.get("/pending", requireAuth, getPendingRequests);

router.get(
  "/members",
  requireAuth,
  getCompanyTeamMembers
);
router.patch(
  "/:id/approve",
  requireAuth,
  approveTeamMember
);

router.patch(
  "/:id/reject",
  requireAuth,
  rejectTeamMember
);



export default router;