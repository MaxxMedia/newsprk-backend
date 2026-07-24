import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    cancelConnectionRequest,
    getMyConnections,
    removeConnection,
    getReceivedRequests,
    getSentRequests,
    getConnectionStatus,
    getMutualConnections,
    getSuggestedConnections,

} from "../controllers/connectionController.js";

const router = express.Router();

router.post("/request", requireAuth, sendConnectionRequest);

router.put(
  "/request/:requestId/accept",
  requireAuth,
  acceptConnectionRequest
);

router.put(
  "/request/:requestId/reject",
  requireAuth,
  rejectConnectionRequest
);

router.put(
  "/request/:requestId/cancel",
  requireAuth,
  cancelConnectionRequest
);

router.get("/", requireAuth, getMyConnections);

router.delete("/:userId", requireAuth, removeConnection);

router.get(
  "/requests/received",
  requireAuth,
  getReceivedRequests
);

router.get(
  "/requests/sent",
  requireAuth,
  getSentRequests
);

router.get(
  "/status/:userId",
  requireAuth,
  getConnectionStatus
);

router.get(
  "/mutual/:userId",
  requireAuth,
  getMutualConnections
);

router.get(
  "/suggestions",
  requireAuth,
  getSuggestedConnections
);

export default router;