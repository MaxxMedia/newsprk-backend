// backend/routes/events.js
import express from "express"
import {
  createEvent,
  publishEvent,
  rejectEvent,
  getUpcomingEvents,
  getEventBySlug,
  getAllEventsAdmin,
  getMyEvents,
  updateEvent,
  incrementEventView,
  registerForEvent,
  getEventRegistrations,
  getEventById,
  createEventEnquiry,
  getEventEnquiries,
  getEventEnquiryById,
  updateEventEnquiryStatus,
  deleteEventEnquiry,
} from "../controllers/eventsController.js"

import { requireAuth, requireAdmin } from "../middleware/auth.js"

const router = express.Router()

/**
 * 🔐 RECRUITER or ADMIN — create / manage own events
 * (must come before the public "/:slug" catch-all)
 */
router.post("/", requireAuth, createEvent)
router.get("/mine", requireAuth, getMyEvents)
router.put("/:id", requireAuth, updateEvent)

/**
 * 🔐 ADMIN ONLY — review queue & moderation
 */
router.get("/admin/all", requireAuth, requireAdmin, getAllEventsAdmin)
router.put("/publish/:id", requireAuth, requireAdmin, publishEvent)
router.put("/reject/:id", requireAuth, requireAdmin, rejectEvent)
router.get("/admin/:id/registrations", requireAuth, requireAdmin, getEventRegistrations)

/**
 * 🔐 Get single event by ID (for editing)
 * IMPORTANT: This must come BEFORE the public "/:slug" route
 */
router.get("/id/:id", requireAuth, getEventById)

/**
 * 🔐 Event Enquiries (Leads)
 */
router.post("/:slug/enquire", createEventEnquiry)
router.get("/:slug/enquiries", requireAuth, getEventEnquiries)
router.get("/enquiries/:id", requireAuth, getEventEnquiryById)
router.patch("/enquiries/:id/status", requireAuth, updateEventEnquiryStatus)
router.delete("/enquiries/:id", requireAuth, deleteEventEnquiry)

/**
 * 🌍 PUBLIC ROUTES (LAST)
 */
router.post("/:slug/register", registerForEvent)
router.post("/:slug/view", incrementEventView)
router.get("/", getUpcomingEvents)
router.get("/:slug", getEventBySlug)

export default router