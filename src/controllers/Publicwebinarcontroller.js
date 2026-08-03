import prisma from "../prismaClient.js"

/**
 * Same model as webinarController.js — webinars are Posts tagged with
 * the Category row { slug: "webinars" }, with webinar-specific data
 * inside Post.contentBlocks. See that file for the full explanation.
 */

const WEBINAR_CATEGORY_SLUG = "webinars"

async function getWebinarCategory() {
    return prisma.category.findUnique({ where: { slug: WEBINAR_CATEGORY_SLUG } })
}

function shapeWebinar(post) {
    const cb = post.contentBlocks || {}
    const isPublished = post.status === "APPROVED" && !!post.publishedAt

    return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        shortDescription: post.excerpt,
        fullDescription: post.content,
        heroImage: post.imageUrl,
        thumbnail: cb.thumbnail || post.imageUrl,
        speakerName: cb.speakerName || "",
        speakerDesignation: cb.speakerDesignation || "",
        speakerCompany: cb.speakerCompany || "",
        speakerImage: cb.speakerImage || "",
        speakerLinkedin: cb.speakerLinkedin || "",
        registrationUrl: cb.registrationUrl || "",
        meetingUrl: cb.meetingUrl || "",
        youtubeUrl: post.youtubeUrl || "",
        startDate: cb.startDate || null,
        endDate: cb.endDate || null,
        duration: cb.duration ?? null,
        language: cb.language || "",
        certificateAvailable: !!cb.certificateAvailable,
        maxSeats: cb.maxSeats ?? null,
        registeredSeats: cb.registeredSeats || 0,
        agenda: Array.isArray(cb.agenda) ? cb.agenda : [],
        learningPoints: Array.isArray(cb.learningPoints) ? cb.learningPoints : [],
        resources: Array.isArray(cb.resources) ? cb.resources : [],
        seoTitle: cb.seoTitle || "",
        seoDescription: cb.seoDescription || "",
        featured: !!cb.featured,
        isOnDemand: !!cb.isOnDemand,
        status: isPublished ? "PUBLISHED" : post.status,
        views: post.views,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
    }
}

/** Base "published webinars" where-clause shared by every public endpoint */
async function publishedWhere() {
    const category = await getWebinarCategory()
    if (!category) return null

    return {
        categoryId: category.id,
        status: "APPROVED",
        publishedAt: { not: null },
    }
}

/**
 * GET /api/webinars
 * Search + filter + paginate + sort published webinars.
 *
 * NOTE: startDate/speaker/featured/isOnDemand all live inside
 * contentBlocks (JSON), so filtering/sorting on those happens in JS
 * after fetching the published set, not as a SQL WHERE/ORDER BY. Fine
 * at typical webinar-catalogue volumes; if this list grows into the
 * thousands, those fields would be worth promoting to real columns.
 */
export const getWebinars = async (req, res) => {
    try {
        const where = await publishedWhere()
        if (!where) return res.json({ data: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 1 } })

        const {
            search,
            speaker,
            filter, // "upcoming" | "completed" | "on-demand"
            featured,
            page = 1,
            limit = 12,
            sortBy = "startDate",
            sortOrder = "desc",
        } = req.query

        if (search) {
            where.title = { contains: search, mode: "insensitive" }
        }

        const posts = await prisma.post.findMany({
            where,
            include: { category: true, Company: true },
        })

        let shaped = posts.map(shapeWebinar)
        const now = new Date()

        if (search) {
            const q = search.toLowerCase()
            shaped = shaped.filter(
                (w) => w.title.toLowerCase().includes(q) || w.speakerName.toLowerCase().includes(q)
            )
        }

        if (speaker) {
            const q = speaker.toLowerCase()
            shaped = shaped.filter((w) => w.speakerName.toLowerCase().includes(q))
        }

        if (featured === "true") {
            shaped = shaped.filter((w) => w.featured)
        }

        if (filter === "upcoming") {
            shaped = shaped.filter((w) => !w.isOnDemand && w.startDate && new Date(w.startDate) >= now)
        } else if (filter === "completed") {
            shaped = shaped.filter((w) => !w.isOnDemand && w.endDate && new Date(w.endDate) < now)
        } else if (filter === "on-demand") {
            shaped = shaped.filter((w) => w.isOnDemand)
        }

        const dir = sortOrder === "asc" ? 1 : -1
        shaped.sort((a, b) => {
            if (sortBy === "views") return (a.views - b.views) * dir
            if (sortBy === "title") return a.title.localeCompare(b.title) * dir
            const aDate = sortBy === "createdAt" ? a.createdAt : a.startDate
            const bDate = sortBy === "createdAt" ? b.createdAt : b.startDate
            return ((new Date(aDate || 0)).getTime() - (new Date(bDate || 0)).getTime()) * dir
        })

        const total = shaped.length
        const skip = (Number(page) - 1) * Number(limit)
        const pageData = shaped.slice(skip, skip + Number(limit))

        res.json({
            data: pageData,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.max(1, Math.ceil(total / Number(limit))),
            },
        })
    } catch (error) {
        console.error("Fetch webinars error:", error)
        res.status(500).json({ error: "Failed to fetch webinars" })
    }
}

/**
 * GET /api/webinars/featured
 */
export const getFeaturedWebinars = async (req, res) => {
    try {
        const where = await publishedWhere()
        if (!where) return res.json([])

        const { limit = 5 } = req.query

        const posts = await prisma.post.findMany({ where, include: { category: true, Company: true } })
        const featured = posts.map(shapeWebinar).filter((w) => w.featured)

        featured.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())

        res.json(featured.slice(0, Number(limit)))
    } catch (error) {
        console.error("Fetch featured webinars error:", error)
        res.status(500).json({ error: "Failed to fetch featured webinars" })
    }
}

/**
 * GET /api/webinars/upcoming
 */
export const getUpcomingWebinars = async (req, res) => {
    try {
        const where = await publishedWhere()
        if (!where) return res.json({ data: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 1 } })

        const { page = 1, limit = 12 } = req.query
        const now = new Date()

        const posts = await prisma.post.findMany({ where, include: { category: true, Company: true } })
        let shaped = posts
            .map(shapeWebinar)
            .filter((w) => !w.isOnDemand && w.startDate && new Date(w.startDate) >= now)

        shaped.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

        const total = shaped.length
        const skip = (Number(page) - 1) * Number(limit)
        const pageData = shaped.slice(skip, skip + Number(limit))

        res.json({
            data: pageData,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.max(1, Math.ceil(total / Number(limit))),
            },
        })
    } catch (error) {
        console.error("Fetch upcoming webinars error:", error)
        res.status(500).json({ error: "Failed to fetch upcoming webinars" })
    }
}

/**
 * GET /api/webinars/on-demand
 */
export const getOnDemandWebinars = async (req, res) => {
    try {
        const where = await publishedWhere()
        if (!where) return res.json({ data: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 1 } })

        const { page = 1, limit = 12 } = req.query

        const posts = await prisma.post.findMany({ where, include: { category: true, Company: true } })
        let shaped = posts.map(shapeWebinar).filter((w) => w.isOnDemand)

        shaped.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())

        const total = shaped.length
        const skip = (Number(page) - 1) * Number(limit)
        const pageData = shaped.slice(skip, skip + Number(limit))

        res.json({
            data: pageData,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.max(1, Math.ceil(total / Number(limit))),
            },
        })
    } catch (error) {
        console.error("Fetch on-demand webinars error:", error)
        res.status(500).json({ error: "Failed to fetch on-demand webinars" })
    }
}

/**
 * GET /api/webinars/:slug
 */
export const getWebinarBySlug = async (req, res) => {
    const { slug } = req.params
    console.log(`[getWebinarBySlug] START — slug="${slug}"`)

    try {
        const where = await publishedWhere()
        console.log(`[getWebinarBySlug] publishedWhere() resolved:`, where)

        if (!where) {
            console.log(`[getWebinarBySlug] No "webinars" category found — returning 404`)
            return res.status(404).json({ error: "Webinar not found" })
        }

        const post = await prisma.post.findFirst({
            where: { ...where, slug },
            include: {
                category: true,
                Company: true,
                User_Post_createdByIdToUser: { select: { id: true, fullName: true } },
            },
        })
        console.log(`[getWebinarBySlug] prisma.post.findFirst resolved:`, post ? `found id=${post.id}` : "null")

        if (!post) {
            console.log(`[getWebinarBySlug] No matching post for slug="${slug}" — returning 404`)
            return res.status(404).json({ error: "Webinar not found" })
        }

        await prisma.post.update({
            where: { id: post.id },
            data: { views: { increment: 1 } },
        })
        console.log(`[getWebinarBySlug] view count incremented, sending response`)

        res.json(shapeWebinar(post))
        console.log(`[getWebinarBySlug] DONE — response sent`)
    } catch (error) {
        console.error("[getWebinarBySlug] ERROR:", error)
        res.status(500).json({ error: "Failed to fetch webinar" })
    }
}

/**
 * GET /api/webinars/:slug/related
 * All webinars share one category, so "related" = other published
 * webinars, most recent first, excluding the current one.
 */
export const getRelatedWebinars = async (req, res) => {
    try {
        const { slug } = req.params
        const { limit = 4 } = req.query

        const where = await publishedWhere()
        if (!where) return res.json([])

        const posts = await prisma.post.findMany({ where, include: { category: true } })
        const shaped = posts.map(shapeWebinar).filter((w) => w.slug !== slug)

        shaped.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime())

        res.json(shaped.slice(0, Number(limit)))
    } catch (error) {
        console.error("Fetch related webinars error:", error)
        res.status(500).json({ error: "Failed to fetch related webinars" })
    }
}

/**
 * POST /api/webinars/:slug/register
 * No separate registrations table — registrants are appended into
 * contentBlocks.registrations, and registeredSeats is incremented
 * alongside it. Not fully concurrency-safe under heavy simultaneous
 * signups (read-modify-write on one JSON column), but fine for normal
 * webinar signup traffic without adding a new table.
 */
export const registerForWebinar = async (req, res) => {
    try {
        const { slug } = req.params
        const { fullName, email, phone, companyName, jobTitle, country, city, industry } = req.body

        if (!fullName || !email) {
            return res.status(400).json({ error: "Full name and email are required" })
        }

        const where = await publishedWhere()
        if (!where) return res.status(404).json({ error: "Webinar not found" })

        const post = await prisma.post.findFirst({ where: { ...where, slug } })
        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        const cb = post.contentBlocks || {}
        const registrations = Array.isArray(cb.registrations) ? cb.registrations : []

        if (registrations.some((r) => r.email?.toLowerCase() === email.toLowerCase())) {
            return res.status(409).json({ error: "You have already registered for this webinar" })
        }

        if (cb.maxSeats && (cb.registeredSeats || 0) >= cb.maxSeats) {
            return res.status(400).json({ error: "This webinar is fully booked" })
        }

        const registration = {
            fullName,
            email,
            phone: phone || null,
            companyName: companyName || null,
            jobTitle: jobTitle || null,
            country: country || null,
            city: city || null,
            industry: industry || null,
            registeredAt: new Date().toISOString(),
        }

        await prisma.post.update({
            where: { id: post.id },
            data: {
                contentBlocks: {
                    ...cb,
                    registrations: [...registrations, registration],
                    registeredSeats: (cb.registeredSeats || 0) + 1,
                },
            },
        })

        res.status(201).json(registration)
    } catch (error) {
        console.error("Webinar registration error:", error)
        res.status(500).json({ error: "Failed to register for webinar" })
    }
}