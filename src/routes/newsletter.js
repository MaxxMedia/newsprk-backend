import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { requirePermission } from "../middleware/permissions.js";

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
  requirePermission("newsletter.view"),
  getAnalytics
);

router.get(
  "/analytics/campaign/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  getCampaignAnalytics
);

/* =======================================================
   SUBSCRIBERS
======================================================= */

router.get(
  "/subscribers",
  requireAuth,
  requirePermission("newsletter.view"),
  getSubscribers
);

router.get(
  "/subscribers/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  getSubscriber
);

router.post(
  "/subscribers",
  requireAuth,
  requirePermission("newsletter.view"),
  createSubscriber
);

router.put(
  "/subscribers/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  updateSubscriber
);

router.delete(
  "/subscribers/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  deleteSubscriber
);

router.post(
  "/subscribers/import",
  requireAuth,
  requirePermission("newsletter.view"),
  importSubscribers
);

router.get(
  "/subscribers/export",
  requireAuth,
  requirePermission("newsletter.view"),
  exportSubscribers
);

/* =======================================================
   TEMPLATES
======================================================= */

router.get(
  "/templates",
  requireAuth,
  requirePermission("newsletter.view"),
  getTemplates
);

router.get(
  "/templates/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  getTemplate
);

router.post(
  "/templates",
  requireAuth,
  requirePermission("newsletter.view"),
  createTemplate
);

router.put(
  "/templates/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  updateTemplate
);

router.delete(
  "/templates/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  deleteTemplate
);

router.post(
  "/templates/:id/duplicate",
  requireAuth,
  requirePermission("newsletter.view"),
  duplicateTemplate
);

router.get(
  "/templates/:id/preview",
  requireAuth,
  requirePermission("newsletter.view"),
  previewTemplate
);

/* =======================================================
   CAMPAIGNS
======================================================= */

router.get(
  "/campaigns",
  requireAuth,
  requirePermission("newsletter.view"),
  getCampaigns
);

router.get(
  "/campaigns/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  getCampaign
);

router.post(
  "/campaigns",
  requireAuth,
  requirePermission("newsletter.view"),
  createCampaign
);

router.put(
  "/campaigns/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  updateCampaign
);

router.delete(
  "/campaigns/:id",
  requireAuth,
  requirePermission("newsletter.view"),
  deleteCampaign
);

router.post(
  "/campaigns/:id/send",
  requireAuth,
  requirePermission("newsletter.view"),
  sendCampaign
);

router.post(
  "/campaigns/:id/schedule",
  requireAuth,
  requirePermission("newsletter.view"),
  scheduleCampaign
);

router.post(
  "/campaigns/:id/cancel",
  requireAuth,
  requirePermission("newsletter.view"),
  cancelCampaign
);

router.post(
  "/campaigns/:id/test",
  requireAuth,
  requirePermission("newsletter.view"),
  sendTestCampaign
);

router.get(
  "/campaigns/:id/recipients",
  requireAuth,
  requirePermission("newsletter.view"),
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