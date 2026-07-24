import express from "express";
import { authenticate } from "../middleware/authenticate.js";
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

router.post("/request", authenticate, sendConnectionRequest);
router.put(
  "/request/:requestId/accept",
  authenticate,
  acceptConnectionRequest
);

router.put(
  "/request/:requestId/reject",
  authenticate,
  rejectConnectionRequest
);

router.put(
  "/request/:requestId/cancel",
  authenticate,
  cancelConnectionRequest
);

router.get(
  "/",
  authenticate,
  getMyConnections
);

router.delete(
  "/:userId",
  authenticate,
  removeConnection
);

router.get(
  "/requests/received",
  authenticate,
  getReceivedRequests
);

router.get(
  "/requests/sent",
  authenticate,
  getSentRequests
);

router.get(
  "/status/:userId",
  authenticate,
  getConnectionStatus
);

router.get(
  "/mutual/:userId",
  authenticate,
 getMutualConnections
);

router.get(
  "/suggestions",
  authenticate,
  getSuggestedConnections
);

export default router;