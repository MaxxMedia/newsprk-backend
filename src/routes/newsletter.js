import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

import {
  subscribeNewsletter,
  unsubscribeNewsletter,

  getSubscribers,
  getSubscriber,

  createSubscriber,
  updateSubscriber,
  deleteSubscriber,

  getCampaigns,
  getCampaign,

  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,

  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/newsletterController.js";

const router = express.Router();

/* ========================================
   PUBLIC
======================================== */

router.post("/subscribe", subscribeNewsletter);

router.post("/unsubscribe", unsubscribeNewsletter);

/* ========================================
   SUBSCRIBERS
======================================== */

router.get(
  "/subscribers",
  requireAuth,
  requireAdmin,
  getSubscribers
);

router.get(
  "/subscribers/:id",
  requireAuth,
  requireAdmin,
  getSubscriber
);

router.post(
  "/subscribers",
  requireAuth,
  requireAdmin,
  createSubscriber
);

router.put(
  "/subscribers/:id",
  requireAuth,
  requireAdmin,
  updateSubscriber
);

router.delete(
  "/subscribers/:id",
  requireAuth,
  requireAdmin,
  deleteSubscriber
);

/* ========================================
   CAMPAIGNS
======================================== */

router.get(
  "/campaigns",
  requireAuth,
  requireAdmin,
  getCampaigns
);

router.get(
  "/campaigns/:id",
  requireAuth,
  requireAdmin,
  getCampaign
);

router.post(
  "/campaigns",
  requireAuth,
  requireAdmin,
  createCampaign
);

router.put(
  "/campaigns/:id",
  requireAuth,
  requireAdmin,
  updateCampaign
);

router.delete(
  "/campaigns/:id",
  requireAuth,
  requireAdmin,
  deleteCampaign
);

router.post(
  "/campaigns/:id/send",
  requireAuth,
  requireAdmin,
  sendCampaign
);

/* ========================================
   TEMPLATES
======================================== */

router.get(
  "/templates",
  requireAuth,
  requireAdmin,
  getTemplates
);

router.post(
  "/templates",
  requireAuth,
  requireAdmin,
  createTemplate
);

router.put(
  "/templates/:id",
  requireAuth,
  requireAdmin,
  updateTemplate
);

router.delete(
  "/templates/:id",
  requireAuth,
  requireAdmin,
  deleteTemplate
);

export default router;