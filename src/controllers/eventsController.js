import { PrismaClient } from "@prisma/client"
import slugify from "slugify"

const prisma = new PrismaClient()

/**
 * ✅ ADMIN: Create Event
 */
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      logoUrl,
      bannerUrl,
      startDate,
      endDate,
      description,
      websiteUrl,
      registerUrl,
      location,
      calendarUrl,
      status
    } = req.body

    const userId = req.user.id // from auth middleware

  const event = await prisma.event.create({
  data: {
    title,
    slug: slugify(title, { lower: true }),
    logoUrl,
    bannerUrl,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    description,
    websiteUrl,
    registerUrl,
    location,
    calendarUrl,
    status: status || "DRAFT",
    createdById: userId,

    // REQUIRED
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
 * ✅ ADMIN: Publish Event
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
        publishedAt: new Date()
      }
    })

    res.json({ success: true, event })
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to publish event" })
  }
}

/**
 * 🌍 PUBLIC: Get Upcoming Events (Search by title)
 * ✅ MySQL / MariaDB compatible
 */
export const getUpcomingEvents = async (req, res) => {
  try {
    const { q } = req.query

    const events = await prisma.event.findMany({
      where: {
        status: "PUBLISHED",
        startDate: {
          gte: new Date(),
        },
        ...(q && {
          title: {
            contains: q, // ✅ works in MySQL
          },
        }),
      },
      orderBy: {
        startDate: "asc",
      },
    })

    res.json(events)
  } catch (error) {
    console.error("Get Upcoming Events Error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    })
  }
}



/**
 * 🌍 PUBLIC: Get Event By Slug
 */
export const getEventBySlug = async (req, res) => {
  try {
    const { slug } = req.params

    const event = await prisma.event.findUnique({
      where: { slug }
    })

    if (!event || event.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Event not found" })
    }

    res.json(event)
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch event" })
  }
}

/**
 * ✅ ADMIN: List All Events
 */
export const getAllEventsAdmin = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
  orderBy: {
    createdAt: "desc",
  },
  include: {
    _count: {
      select: {
        EventRegistration: true,
      },
    },
  },
})


    res.json(events)
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch events" })
  }
}

/**
 * ✅ ADMIN: Update Event
 */
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params

    const {
      title,
      logoUrl,
      bannerUrl,
      startDate,
      endDate,
      description,
      websiteUrl,
      registerUrl,
      location,
      calendarUrl,
    } = req.body

    const event = await prisma.event.update({
      where: { id: Number(id) },
      data: {
        title,
        logoUrl,
        bannerUrl,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        websiteUrl,
        registerUrl,
        location,
        calendarUrl,
      },
    })

    res.json({ success: true, event })
  } catch (error) {
    console.error("Update Event Error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to update event",
    })
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
      data: {
        views: {
          increment: 1,
        },
      },
    })

    res.json({ success: true })
  } catch (error) {
    console.error("Increment Event View Error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to increment view",
    })
  }
}

/**
 * 🌍 PUBLIC: Register for Event (WITH CAPTCHA VERIFICATION)
 */
export const registerForEvent = async (req, res) => {
  try {
    const { slug } = req.params
    const { captchaToken, ...formData } = req.body

    // 1️⃣ Check captcha exists
    if (!captchaToken) {
      return res.status(400).json({
        success: false,
        message: "Captcha token missing",
      })
    }

    // 2️⃣ Ensure secret key exists
    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.error("❌ TURNSTILE_SECRET_KEY not set")
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      })
    }

    // 3️⃣ Verify Turnstile (NO remoteip – important)
    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: captchaToken,
        }).toString(),
      }
    )

    const verifyData = await verifyResponse.json()

    // console.log("🔐 Turnstile full response:", verifyData)

    if (!verifyData.success) {
      return res.status(400).json({
        success: false,
        message: "Captcha verification failed",
        errorCodes: verifyData["error-codes"],
      })
    }

    // 4️⃣ Check event exists
    const event = await prisma.event.findUnique({
      where: { slug },
    })

    if (!event || event.status !== "PUBLISHED") {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      })
    }

    // 5️⃣ Prevent duplicate registration
    const existing = await prisma.eventRegistration.findFirst({
      where: {
        eventId: event.id,
        email: formData.email,
      },
    })

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You have already registered for this event.",
      })
    }

    // 6️⃣ Create registration
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
    return res.status(500).json({
      success: false,
      message: "Server error",
    })
  }
}

export const getEventRegistrations = async (req, res) => {
  try {
    const { id } = req.params

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        eventId: Number(id),
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    res.json(registrations)
  } catch (error) {
    console.error("❌ Get Registrations Error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch registrations",
    })
  }
}



