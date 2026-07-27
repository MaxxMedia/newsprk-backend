// backend/controllers/eventsController.js
import { PrismaClient } from "@prisma/client"
import slugify from "slugify"

const prisma = new PrismaClient()

/**
 * Helper: accept a highlights/otherImages/videoGallery array whether it
 * arrives as a real array (JSON body) or, defensively, a JSON string.
 */
function parseArrayField(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * ✅ RECRUITER or ADMIN: Create Event
 */
export const createEvent = async (req, res) => {
  try {
    if (!["recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only recruiters or admins can submit events",
      })
    }

    const {
      title,
      eventType,
      startDate,
      endDate,
      timings,
      venue,           // → stored as `location`
      city,
      country,
      websiteUrl,
      logoUrl,
      bannerUrl,
      shortDescription,
      description,
      highlights,
      organizationName,
      contactPerson,
      email,           // → stored as `organizerEmail`
      mobileNumber,    // → stored as `organizerMobile`
      phoneNumber,     // → stored as `organizerPhone`
      organizationWebsite,
      address,
      brochureUrl,
      otherImages,
      videoGallery,
      facebookUrl,
      twitterUrl,
      linkedinUrl,
      youtubeUrl,
      action,          // "draft" | "submit" | "publish" (admin only)
    } = req.body

    const required = {
      title, eventType, startDate, endDate, timings,
      venue, city, country, shortDescription, description,
      organizationName, contactPerson, email, mobileNumber, address,
    }
    const missing = Object.entries(required)
      .filter(([, v]) => !v || String(v).trim() === "")
      .map(([k]) => k)

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
      })
    }

    const highlightsArr = parseArrayField(highlights).filter(h => h && h.trim())
    if (highlightsArr.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least 3 event highlights",
      })
    }

    const otherImagesArr = parseArrayField(otherImages).filter(Boolean)
    const videoGalleryArr = parseArrayField(videoGallery).filter(Boolean) // ✅ FIX — was missing, caused ReferenceError

    let status = "DRAFT"
    if (action === "submit") status = "PENDING"
    if (action === "publish" && req.user.role === "admin") status = "PUBLISHED"

    const baseSlug = slugify(title, { lower: true })
    let slug = baseSlug
    let suffix = 1
    while (await prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`
    }

    const event = await prisma.event.create({
      data: {
        title,
        slug,
        eventType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        timings,
        location: venue,
        city,
        country,
        websiteUrl: websiteUrl || null,
        logoUrl: logoUrl || null,
        bannerUrl: bannerUrl || null,
        shortDescription,
        description,
        highlights: highlightsArr,
        organizationName,
        contactPerson,
        organizerEmail: email,
        organizerMobile: mobileNumber,
        organizerPhone: phoneNumber || null,
        organizationWebsite: organizationWebsite || null,
        address,
        brochureUrl: brochureUrl || null,
        otherImages: otherImagesArr,
        videoGallery: videoGalleryArr,
        facebookUrl: facebookUrl || null,
        twitterUrl: twitterUrl || null,
        linkedinUrl: linkedinUrl || null,
        youtubeUrl: youtubeUrl || null,
        status,
        createdById: req.user.id,
        approvedById: status === "PUBLISHED" ? req.user.id : null,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        updatedAt: new Date(),
      },
    })

    res.status(201).json({ success: true, event })
  } catch (error) {
    console.error("Create Event Error:", error)
    res.status(500).json({ success: false, message: "Failed to create event" })
  }
}

/**
 * ✅ Get single event by ID (for editing)
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    const event = await prisma.event.findUnique({
      where: { id: Number(id) },
    })

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    const isAdmin = userRole === "admin"
    const isOwner = event.createdById === userId

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this event",
      })
    }

    const frontendEvent = {
      id: event.id,
      title: event.title,
      eventType: event.eventType || "",
      startDate: event.startDate ? event.startDate.toISOString().slice(0, 10) : "",
      endDate: event.endDate ? event.endDate.toISOString().slice(0, 10) : "",
      timings: event.timings || "",
      venue: event.location || "",
      city: event.city || "",
      country: event.country || "",
      websiteUrl: event.websiteUrl || "",
      logoUrl: event.logoUrl || "",
      bannerUrl: event.bannerUrl || "",
      shortDescription: event.shortDescription || "",
      description: event.description || "",
      highlights: event.highlights || ["", "", ""],
      organizationName: event.organizationName || "",
      contactPerson: event.contactPerson || "",
      email: event.organizerEmail || "",
      mobileNumber: event.organizerMobile || "",
      phoneNumber: event.organizerPhone || "",
      organizationWebsite: event.organizationWebsite || "",
      address: event.address || "",
      brochureUrl: event.brochureUrl || "",
      otherImages: event.otherImages || [],
      videoGallery: event.videoGallery || [], // ✅ FIX — was missing, edit form never saw existing videos
      facebookUrl: event.facebookUrl || "",
      twitterUrl: event.twitterUrl || "",
      linkedinUrl: event.linkedinUrl || "",
      youtubeUrl: event.youtubeUrl || "",
      status: event.status,
    }

    res.json({
      success: true,
      event: frontendEvent,
    })
  } catch (error) {
    console.error("Get Event By ID Error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
    })
  }
}

/**
 * ✅ Recruiter/Admin: view own submitted events (all statuses)
 */
export const getMyEvents = async (req, res) => {
  try {
    if (!["recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Not allowed" })
    }

    const events = await prisma.event.findMany({
      where: { createdById: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { EventRegistration: true } },
      },
    })

    res.json({ success: true, events })
  } catch (error) {
    console.error("Get My Events Error:", error)
    res.status(500).json({ success: false, message: "Failed to fetch your events" })
  }
}

/**
 * ✅ ADMIN: Publish (approve) a PENDING event
 */
export const publishEvent = async (req, res) => {
  try {
    const { id } = req.params
    const adminId = req.user.id

    const event = await prisma.event.update({
      where: { id: Number(id) },
      data: {
        status: "PUBLISHED",
        approvedById: adminId,
        publishedAt: new Date(),
        rejectionReason: null,
      },
    })

    res.json({ success: true, event })
  } catch (error) {
    console.error("Publish Event Error:", error)
    res.status(500).json({ success: false, message: "Failed to publish event" })
  }
}

/**
 * ✅ ADMIN: Reject a PENDING event
 */
export const rejectEvent = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const event = await prisma.event.update({
      where: { id: Number(id) },
      data: {
        status: "REJECTED",
        approvedById: req.user.id,
        rejectionReason: reason || "Not specified",
      },
    })

    res.json({ success: true, event })
  } catch (error) {
    console.error("Reject Event Error:", error)
    res.status(500).json({ success: false, message: "Failed to reject event" })
  }
}

/**
 * 🌍 PUBLIC: Get Upcoming Events (Search by title)
 */
export const getUpcomingEvents = async (req, res) => {
  try {
    const { q } = req.query

    const events = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startDate: { gte: new Date() },
        ...(q && { title: { contains: q } }),
      },
      orderBy: { startDate: "asc" },
    })

    res.json(events)
  } catch (error) {
    console.error("Get Upcoming Events Error:", error)
    res.status(500).json({ success: false, message: "Failed to fetch events" })
  }
}

/**
 * 🌍 PUBLIC: Get Event By Slug
 */
export const getEventBySlug = async (req, res) => {
  try {
    const { slug } = req.params
    const event = await prisma.event.findUnique({ where: { slug } })

    if (!event || event.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Event not found" })
    }

    res.json(event)
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch event" })
  }
}

/**
 * ✅ ADMIN: List All Events (including pending review queue)
 */
export const getAllEventsAdmin = async (req, res) => {
  try {
    const { status } = req.query

    const events = await prisma.event.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { EventRegistration: true } },
        User_Event_createdByIdToUser: {
          select: { id: true, fullName: true, email: true, companyId: true },
        },
      },
    })

    res.json(events)
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch events" })
  }
}

/**
 * ✅ Owner (recruiter) or Admin: Update Event
 */
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params

    const existing = await prisma.event.findUnique({ where: { id: Number(id) } })
    if (!existing) {
      return res.status(404).json({ success: false, message: "Event not found" })
    }
    if (req.user.role !== "admin" && existing.createdById !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" })
    }

    const {
      title, eventType, startDate, endDate, timings,
      venue, city, country, websiteUrl, logoUrl, bannerUrl,
      shortDescription, description, highlights,
      organizationName, contactPerson, email, mobileNumber, phoneNumber,
      organizationWebsite, address, brochureUrl, otherImages,
      videoGallery, facebookUrl, twitterUrl, linkedinUrl, youtubeUrl,
      action,
    } = req.body

    const data = {
      ...(title && { title }),
      ...(eventType && { eventType }),
      ...(timings && { timings }),
      ...(venue && { location: venue }),
      ...(city && { city }),
      ...(country && { country }),
      ...(websiteUrl !== undefined && { websiteUrl: websiteUrl || null }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      ...(bannerUrl !== undefined && { bannerUrl: bannerUrl || null }),
      ...(shortDescription && { shortDescription }),
      ...(description && { description }),
      ...(organizationName && { organizationName }),
      ...(contactPerson && { contactPerson }),
      ...(email && { organizerEmail: email }),
      ...(mobileNumber && { organizerMobile: mobileNumber }),
      ...(phoneNumber !== undefined && { organizerPhone: phoneNumber || null }),
      ...(organizationWebsite !== undefined && { organizationWebsite: organizationWebsite || null }),
      ...(address && { address }),
      ...(brochureUrl !== undefined && { brochureUrl: brochureUrl || null }),
      ...(facebookUrl !== undefined && { facebookUrl: facebookUrl || null }),
      ...(twitterUrl !== undefined && { twitterUrl: twitterUrl || null }),
      ...(linkedinUrl !== undefined && { linkedinUrl: linkedinUrl || null }),
      ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl || null }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(highlights && { highlights: parseArrayField(highlights).filter(h => h && h.trim()) }),
      ...(otherImages && { otherImages: parseArrayField(otherImages).filter(Boolean) }),
      ...(videoGallery && { videoGallery: parseArrayField(videoGallery).filter(Boolean) }),
    }

    if (existing.status === "REJECTED" && action === "submit") {
      data.status = "PENDING"
      data.rejectionReason = null
    }
    if (action === "publish" && req.user.role === "admin") {
      data.status = "PUBLISHED"
      data.publishedAt = new Date()
      data.approvedById = req.user.id
    }

    const event = await prisma.event.update({
      where: { id: Number(id) },
      data,
    })

    res.json({ success: true, event })
  } catch (error) {
    console.error("Update Event Error:", error)
    res.status(500).json({ success: false, message: "Failed to update event" })
  }
}

/**
 * 👁️ PUBLIC: Increment Event View
 */
export const incrementEventView = async (req, res) => {
  try {
    const { slug } = req.params
    await prisma.event.update({
      where: { slug },
      data: { views: { increment: 1 } },
    })
    res.json({ success: true })
  } catch (error) {
    console.error("Increment Event View Error:", error)
    res.status(500).json({ success: false, message: "Failed to increment view" })
  }
}

/**
 * 🌍 PUBLIC: Register for Event (WITH CAPTCHA VERIFICATION)
 */
export const registerForEvent = async (req, res) => {
  try {
    const { slug } = req.params
    const { captchaToken, ...formData } = req.body

    if (!captchaToken) {
      return res.status(400).json({ success: false, message: "Captcha token missing" })
    }
    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.error("❌ TURNSTILE_SECRET_KEY not set")
      return res.status(500).json({ success: false, message: "Server configuration error" })
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: captchaToken,
        }).toString(),
      }
    )
    const verifyData = await verifyResponse.json()

    if (!verifyData.success) {
      return res.status(400).json({
        success: false,
        message: "Captcha verification failed",
        errorCodes: verifyData["error-codes"],
      })
    }

    const event = await prisma.event.findUnique({ where: { slug } })
    if (!event || event.status !== "PUBLISHED") {
      return res.status(404).json({ success: false, message: "Event not found" })
    }

    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId: event.id, email: formData.email },
    })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already registered for this event.",
      })
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        eventId: event.id,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        companyName: formData.companyName || null,
        jobTitle: formData.jobTitle || null,
        country: formData.country || null,
        specialRequirements: formData.specialRequirements || null,
      },
    })

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      registration,
    })
  } catch (error) {
    console.error("❌ Register Event Error:", error)
    return res.status(500).json({ success: false, message: "Server error" })
  }
}

export const getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: Number(id) },
      orderBy: { createdAt: "desc" },
    })
    res.json(registrations)
  } catch (error) {
    console.error("❌ Get Registrations Error:", error)
    res.status(500).json({ success: false, message: "Failed to fetch registrations" })
  }
}

/**
 * ✅ Create Event Enquiry (Public)
 * Anyone can enquire about a published event
 */
export const createEventEnquiry = async (req, res) => {
  try {
    const { slug } = req.params
    const { name, email, mobile, message } = req.body

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and message are required fields"
      })
    }

    // Find the event
    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true
      }
    })

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      })
    }

    // Check if event is published
    if (event.status !== "PUBLISHED") {
      return res.status(403).json({
        success: false,
        message: "This event is not accepting enquiries"
      })
    }

    // Create the enquiry
    const enquiry = await prisma.eventEnquiry.create({
      data: {
        eventId: event.id,
        name,
        email,
        mobile: mobile || null,
        message,
        status: "NEW",
      }
    })

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: enquiry
    })

  } catch (error) {
    console.error("Error creating event enquiry:", error)
    res.status(500).json({
      success: false,
      message: "Failed to submit enquiry",
      error: error.message
    })
  }
}

/**
 * ✅ Get all enquiries for an event
 * Recruiter: can only see enquiries for their own events
 * Admin: can see enquiries for all events
 */
export const getEventEnquiries = async (req, res) => {
  try {
    const { slug } = req.params
    const userRole = req.user.role
    const userId = req.user.id

    // Find the event
    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        createdById: true,
        title: true,
        slug: true,
      }
    })

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      })
    }

    // Check permissions
    const isAdmin = userRole === "admin"
    const isOwner = event.createdById === userId

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view enquiries for this event"
      })
    }

    const enquiries = await prisma.eventEnquiry.findMany({
      where: { eventId: event.id },
      orderBy: { createdAt: 'desc' }
    })

    res.status(200).json({
      success: true,
      count: enquiries.length,
      data: enquiries,
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
      }
    })

  } catch (error) {
    console.error("Error fetching event enquiries:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch enquiries",
      error: error.message
    })
  }
}

/**
 * ✅ Get single enquiry by ID
 */
export const getEventEnquiryById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    const enquiry = await prisma.eventEnquiry.findUnique({
      where: { id: parseInt(id) },
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            slug: true,
            createdById: true,
          }
        }
      }
    })

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      })
    }

    // Check permissions
    const isAdmin = userRole === "admin"
    const isOwner = enquiry.Event.createdById === userId

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this enquiry"
      })
    }

    res.status(200).json({
      success: true,
      data: enquiry
    })

  } catch (error) {
    console.error("Error fetching enquiry:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch enquiry",
      error: error.message
    })
  }
}

/**
 * ✅ Update enquiry status
 */
export const updateEventEnquiryStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const userId = req.user.id
    const userRole = req.user.role

    const validStatuses = ['NEW', 'IN_PROGRESS', 'RESPONDED', 'RESOLVED', 'ARCHIVED']

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      })
    }

    const enquiry = await prisma.eventEnquiry.findUnique({
      where: { id: parseInt(id) },
      include: {
        Event: {
          select: {
            createdById: true,
          }
        }
      }
    })

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      })
    }

    // Check permissions
    const isAdmin = userRole === "admin"
    const isOwner = enquiry.Event.createdById === userId

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this enquiry"
      })
    }

    const updated = await prisma.eventEnquiry.update({
      where: { id: parseInt(id) },
      data: { status }
    })

    res.status(200).json({
      success: true,
      message: "Enquiry status updated successfully",
      data: updated
    })

  } catch (error) {
    console.error("Error updating enquiry status:", error)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      })
    }
    res.status(500).json({
      success: false,
      message: "Failed to update enquiry status",
      error: error.message
    })
  }
}

/**
 * ✅ Delete enquiry
 */
export const deleteEventEnquiry = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    const enquiry = await prisma.eventEnquiry.findUnique({
      where: { id: parseInt(id) },
      include: {
        Event: {
          select: {
            createdById: true,
          }
        }
      }
    })

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      })
    }

    // Check permissions
    const isAdmin = userRole === "admin"
    const isOwner = enquiry.Event.createdById === userId

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this enquiry"
      })
    }

    await prisma.eventEnquiry.delete({
      where: { id: parseInt(id) }
    })

    res.status(200).json({
      success: true,
      message: "Enquiry deleted successfully"
    })

  } catch (error) {
    console.error("Error deleting enquiry:", error)
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      })
    }
    res.status(500).json({
      success: false,
      message: "Failed to delete enquiry",
      error: error.message
    })
  }
}