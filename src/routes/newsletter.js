import express from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

import {
  /* ===========================
      PUBLIC
  =========================== */

  subscribeNewsletter,
  unsubscribeNewsletter,

  /* ===========================
      ANALYTICS
  =========================== */

  getAnalytics,
  getCampaignAnalytics,

  /* ===========================
      SUBSCRIBERS
  =========================== */

  getSubscribers,
  getSubscriber,
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,

  importSubscribers,
  exportSubscribers,

  /* ===========================
      TEMPLATES
  =========================== */

  getTemplates,
  getTemplate,

  createTemplate,
  updateTemplate,
  deleteTemplate,

  duplicateTemplate,
  previewTemplate,

  /* ===========================
      CAMPAIGNS
  =========================== */

  getCampaigns,
  getCampaign,

  createCampaign,
  updateCampaign,
  deleteCampaign,

  sendCampaign,
  scheduleCampaign,
  cancelCampaign,
  sendTestCampaign,

  getCampaignRecipients,
} from "../controllers/newsletterController.js";

const router = express.Router();

/* =======================================================
   PUBLIC
======================================================= */

router.post("/subscribe", subscribeNewsletter);

router.post("/unsubscribe", unsubscribeNewsletter);

/* =======================================================
   ANALYTICS
======================================================= */

router.get(
  "/analytics",
  requireAuth,
  requireAdmin,
  getAnalytics
);

router.get(
  "/analytics/campaign/:id",
  requireAuth,
  requireAdmin,
  getCampaignAnalytics
);

/* =======================================================
   SUBSCRIBERS
======================================================= */

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

router.post(
  "/subscribers/import",
  requireAuth,
  requireAdmin,
  importSubscribers
);

router.get(
  "/subscribers/export",
  requireAuth,
  requireAdmin,
  exportSubscribers
);

/* =======================================================
   TEMPLATES
======================================================= */

router.get(
  "/templates",
  requireAuth,
  requireAdmin,
  getTemplates
);

router.get(
  "/templates/:id",
  requireAuth,
  requireAdmin,
  getTemplate
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

router.post(
  "/templates/:id/duplicate",
  requireAuth,
  requireAdmin,
  duplicateTemplate
);

router.get(
  "/templates/:id/preview",
  requireAuth,
  requireAdmin,
  previewTemplate
);

/* =======================================================
   CAMPAIGNS
======================================================= */

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

router.post(
  "/campaigns/:id/schedule",
  requireAuth,
  requireAdmin,
  scheduleCampaign
);

router.post(
  "/campaigns/:id/cancel",
  requireAuth,
  requireAdmin,
  cancelCampaign
);

router.post(
  "/campaigns/:id/test",
  requireAuth,
  requireAdmin,
  sendTestCampaign
);

router.get(
  "/campaigns/:id/recipients",
  requireAuth,
  requireAdmin,
  getCampaignRecipients
);

export default router;




// Feature Checklist
// Public
// ✅ Subscribe
// ✅ Unsubscribe
// Dashboard
// ✅ Overall Analytics
// ✅ Campaign Analytics
// Subscribers
// ✅ List Subscribers
// ✅ Get Subscriber
// ✅ Create
// ✅ Update
// ✅ Delete
// ✅ Import CSV
// ✅ Export CSV
// Templates
// ✅ List Templates
// ✅ Get Single Template
// ✅ Create
// ✅ Update
// ✅ Delete
// ✅ Duplicate Template
// ✅ Preview Template
// Campaigns
// ✅ List Campaigns
// ✅ Get Campaign
// ✅ Create Campaign
// ✅ Update Campaign
// ✅ Delete Campaign
// ✅ Send Campaign
// ✅ Schedule Campaign
// ✅ Cancel Scheduled Campaign
// ✅ Send Test Campaign
// ✅ View Campaign Recipients