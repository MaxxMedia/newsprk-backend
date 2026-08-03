import prisma from "../prismaClient.js"
import slugify from "slugify"

/**
 * ============================================================
 * WEBINARS = POSTS, tagged with the Category row { slug: "webinars" }
 * ============================================================
 * No separate Webinar table. No schema changes. Everything lives on
 * the existing Post model, exactly like recruiter articles use
 * `machine`, `cuttingtools`, etc. — webinars are just another category.
 *
 * Webinar-specific fields (speaker, agenda, resources, schedule, seats,
 * featured, on-demand...) are stored inside Post.contentBlocks (Json?),
 * which already exists on Post for exactly this kind of flexible data.
 * The recording/video link uses Post.youtubeUrl directly since that
 * column already exists as a first-class field.
 *
 * Post_status only has PENDING / APPROVED / REJECTED (no DRAFT /
 * PUBLISHED / ARCHIVED), so "published" is derived from
 * status === APPROVED && publishedAt is set — same pattern your other
 * approval flows already use.
 * ============================================================
 */

const WEBINAR_CATEGORY_SLUG = "webinars"

/**
 * Finds the "Webinars" category row, creating it once if it doesn't
 * exist yet — so you never have to manually add it up front, it just
 * appears in your Category table the first time a webinar is created.
 */
async function getOrCreateWebinarCategory() {
    let category = await prisma.category.findUnique({
        where: { slug: WEBINAR_CATEGORY_SLUG },
    })

    if (!category) {
        category = await prisma.category.create({
            data: { name: "Webinars", slug: WEBINAR_CATEGORY_SLUG },
        })
    }

    return category
}

/**
 * Flattens a Post row (+ its contentBlocks JSON) into the webinar shape
 * the frontend already expects — same field names as before, so the
 * admin list/form/detail pages don't need to change at all.
 */
function shapeWebinar(post) {
    const cb = post.contentBlocks || {}
    const isPublished = post.status === "APPROVED" && !!post.publishedAt

    const status =
        post.status === "REJECTED"
            ? "REJECTED"
            : post.status === "PENDING"
                ? "PENDING"
                : isPublished
                    ? "PUBLISHED"
                    : "APPROVED"

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
        seoKeywords: cb.seoKeywords || null,
        featured: !!cb.featured,
        isOnDemand: !!cb.isOnDemand,
        rejectionReason: cb.rejectionReason || null,
        status,
        views: post.views,
        createdById: post.createdById,
        approvedById: post.approvedById,
        approvedAt: post.approvedAt,
        publishedAt: post.publishedAt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        category: post.category,
    }
}

const ADMIN_INCLUDE = {
    category: true,
    User_Post_createdByIdToUser: { select: { id: true, fullName: true, email: true } },
    User_Post_approvedByIdToUser: { select: { id: true, fullName: true, email: true } },
}

/**
 * CREATE webinar (admin) — creates a Post in the Webinars category
 */
export const createWebinar = async (req, res) => {
    try {
        const user = req.user

        const {
            title,
            shortDescription,
            fullDescription,
            heroImage,
            thumbnail,
            speakerName,
            speakerDesignation,
            speakerCompany,
            speakerImage,
            speakerLinkedin,
            registrationUrl,
            meetingUrl,
            youtubeUrl,
            startDate,
            endDate,
            duration,
            language,
            certificateAvailable,
            maxSeats,
            agenda,
            learningPoints,
            resources,
            seoTitle,
            seoDescription,
            seoKeywords,
        } = req.body

        if (!title || !speakerName || !startDate) {
            return res.status(400).json({
                error: "Title, speaker name and start date are required",
            })
        }

        const category = await getOrCreateWebinarCategory()

        const slug = `${slugify(title, {
            lower: true,
            strict: true,
            trim: true,
        })}-${Date.now()}`

        const post = await prisma.post.create({
            data: {
                title,
                slug,
                badge: "Webinar",
                excerpt: shortDescription,
                content: fullDescription,
                imageUrl: heroImage,
                youtubeUrl,
                categoryId: category.id,
                status: "PENDING",
                createdById: user.id,
                publishedAt: null,
                contentBlocks: {
                    type: "webinar",
                    thumbnail,
                    speakerName,
                    speakerDesignation,
                    speakerCompany,
                    speakerImage,
                    speakerLinkedin,
                    registrationUrl,
                    meetingUrl,
                    startDate,
                    endDate,
                    duration: duration ? Number(duration) : null,
                    language,
                    certificateAvailable: !!certificateAvailable,
                    maxSeats: maxSeats ? Number(maxSeats) : null,
                    registeredSeats: 0,
                    agenda: agenda || [],
                    learningPoints: learningPoints || [],
                    resources: resources || [],
                    seoTitle,
                    seoDescription,
                    seoKeywords,
                    featured: false,
                    isOnDemand: false,
                },
            },
            include: ADMIN_INCLUDE,
        })

        return res.status(201).json(shapeWebinar(post))
    } catch (error) {
        console.error("Create webinar error:", error)

        if (error?.code === "P2002") {
            return res.status(409).json({ error: "Slug must be unique" })
        }

        return res.status(500).json({ error: "Internal server error" })
    }
}

/**
 * GET webinar counts per (derived) status — powers list-view tab badges
 */
export const getAdminWebinarStats = async (req, res) => {
    try {
        const category = await getOrCreateWebinarCategory()
        const base = { categoryId: category.id }

        const [pending, approvedTotal, rejected, published] = await Promise.all([
            prisma.post.count({ where: { ...base, status: "PENDING" } }),
            prisma.post.count({ where: { ...base, status: "APPROVED" } }),
            prisma.post.count({ where: { ...base, status: "REJECTED" } }),
            prisma.post.count({
                where: { ...base, status: "APPROVED", publishedAt: { not: null } },
            }),
        ])

        const approvedNotPublished = approvedTotal - published
        const total = pending + approvedTotal + rejected

        res.json({
            total,
            DRAFT: 0, // no DRAFT concept on Post — always empty
            PENDING: pending,
            APPROVED: approvedNotPublished,
            PUBLISHED: published,
            REJECTED: rejected,
            ARCHIVED: 0, // no ARCHIVED concept on Post — always empty
        })
    } catch (error) {
        console.error("Fetch webinar stats error:", error)
        res.status(500).json({ error: "Failed to fetch webinar stats" })
    }
}

/**
 * GET all webinars (admin) — any status, filterable, searchable
 */
export const getAdminWebinars = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query
        const category = await getOrCreateWebinarCategory()

        const where = { categoryId: category.id }

        if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
            where.status = status
        } else if (status === "PUBLISHED") {
            where.status = "APPROVED"
            where.publishedAt = { not: null }
        } else if (status === "DRAFT" || status === "ARCHIVED") {
            // Post has no such state — always empty for these two tabs
            where.id = -1
        }

        if (search) {
            where.title = { contains: search, mode: "insensitive" }
        }

        const allMatching = await prisma.post.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: ADMIN_INCLUDE,
        })

        let shaped = allMatching.map(shapeWebinar)

        // speaker name lives inside contentBlocks (JSON), so it's filtered
        // here rather than at the database level
        if (search) {
            const q = search.toLowerCase()
            shaped = shaped.filter(
                (w) =>
                    w.title.toLowerCase().includes(q) ||
                    w.speakerName.toLowerCase().includes(q)
            )
        }

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
        console.error("Fetch admin webinars error:", error)
        res.status(500).json({ error: "Failed to fetch webinars" })
    }
}

/**
 * GET single webinar by id (admin, for edit page)
 */
export const getAdminWebinarById = async (req, res) => {
    try {
        const postId = Number(req.params.id)

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: ADMIN_INCLUDE,
        })

        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        res.json(shapeWebinar(post))
    } catch (error) {
        console.error("Fetch admin webinar error:", error)
        res.status(500).json({ error: "Failed to fetch webinar" })
    }
}

/**
 * UPDATE webinar (admin)
 */
export const updateWebinar = async (req, res) => {
    try {
        const postId = Number(req.params.id)

        const existing = await prisma.post.findUnique({ where: { id: postId } })
        if (!existing) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        const existingBlocks = existing.contentBlocks || {}

        const {
            title,
            shortDescription,
            fullDescription,
            heroImage,
            thumbnail,
            speakerName,
            speakerDesignation,
            speakerCompany,
            speakerImage,
            speakerLinkedin,
            registrationUrl,
            meetingUrl,
            youtubeUrl,
            startDate,
            endDate,
            duration,
            language,
            certificateAvailable,
            maxSeats,
            agenda,
            learningPoints,
            resources,
            seoTitle,
            seoDescription,
            seoKeywords,
        } = req.body

        const updated = await prisma.post.update({
            where: { id: postId },
            data: {
                title,
                excerpt: shortDescription,
                content: fullDescription,
                imageUrl: heroImage,
                youtubeUrl,
                ...(title && {
                    slug: slugify(title, { lower: true, strict: true }),
                }),
                contentBlocks: {
                    ...existingBlocks,
                    type: "webinar",
                    thumbnail,
                    speakerName,
                    speakerDesignation,
                    speakerCompany,
                    speakerImage,
                    speakerLinkedin,
                    registrationUrl,
                    meetingUrl,
                    startDate,
                    endDate,
                    duration: duration ? Number(duration) : null,
                    language,
                    certificateAvailable: !!certificateAvailable,
                    maxSeats: maxSeats ? Number(maxSeats) : null,
                    agenda: agenda || [],
                    learningPoints: learningPoints || [],
                    resources: resources || [],
                    seoTitle,
                    seoDescription,
                    seoKeywords,
                },
                updatedAt: new Date(),
            },
            include: ADMIN_INCLUDE,
        })

        return res.json(shapeWebinar(updated))
    } catch (error) {
        console.error("Update webinar error:", error)

        if (error?.code === "P2002") {
            return res.status(409).json({ error: "Slug must be unique" })
        }

        return res.status(500).json({ error: "Internal server error" })
    }
}

/**
 * DELETE webinar (admin)
 */
export const deleteWebinar = async (req, res) => {
    try {
        const postId = Number(req.params.id)

        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        await prisma.post.delete({ where: { id: postId } })

        return res.json({ success: true })
    } catch (error) {
        console.error("Delete webinar error:", error)
        return res.status(500).json({ error: "Internal server error" })
    }
}

/**
 * APPROVE webinar (admin)
 */
export const approveWebinar = async (req, res) => {
    try {
        const user = req.user
        const postId = Number(req.params.id)

        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        const existingBlocks = post.contentBlocks || {}

        const updated = await prisma.post.update({
            where: { id: postId },
            data: {
                status: "APPROVED",
                approvedById: user.id,
                approvedAt: new Date(),
                contentBlocks: { ...existingBlocks, rejectionReason: null },
            },
            include: ADMIN_INCLUDE,
        })

        res.json(shapeWebinar(updated))
    } catch (error) {
        console.error("Approve webinar error:", error)
        res.status(500).json({ error: "Failed to approve webinar" })
    }
}

/**
 * REJECT webinar (admin)
 */
export const rejectWebinar = async (req, res) => {
    try {
        const user = req.user
        const postId = Number(req.params.id)
        const { reason } = req.body

        if (!reason) {
            return res.status(400).json({ error: "Rejection reason is required" })
        }

        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        const existingBlocks = post.contentBlocks || {}

        const updated = await prisma.post.update({
            where: { id: postId },
            data: {
                status: "REJECTED",
                approvedById: user.id,
                approvedAt: new Date(),
                contentBlocks: { ...existingBlocks, rejectionReason: reason },
            },
            include: ADMIN_INCLUDE,
        })

        res.json(shapeWebinar(updated))
    } catch (error) {
        console.error("Reject webinar error:", error)
        res.status(500).json({ error: "Failed to reject webinar" })
    }
}

/**
 * PUBLISH webinar (admin) — must be APPROVED first
 */
export const publishWebinar = async (req, res) => {
    try {
        const postId = Number(req.params.id)

        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        if (post.status !== "APPROVED") {
            return res.status(400).json({
                error: "Webinar must be approved before it can be published",
            })
        }

        const updated = await prisma.post.update({
            where: { id: postId },
            data: { publishedAt: new Date() },
            include: ADMIN_INCLUDE,
        })

        res.json(shapeWebinar(updated))
    } catch (error) {
        console.error("Publish webinar error:", error)
        res.status(500).json({ error: "Failed to publish webinar" })
    }
}

/**
 * DRAFT webinar (admin) — unpublish, keeps it Approved but hides it publicly
 */
export const draftWebinar = async (req, res) => {
    try {
        const postId = Number(req.params.id)

        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        const updated = await prisma.post.update({
            where: { id: postId },
            data: { publishedAt: null },
            include: ADMIN_INCLUDE,
        })

        res.json(shapeWebinar(updated))
    } catch (error) {
        console.error("Draft webinar error:", error)
        res.status(500).json({ error: "Failed to move webinar to draft" })
    }
}

/**
 * TOGGLE featured (admin) — stored inside contentBlocks, no schema field
 */
export const toggleFeatureWebinar = async (req, res) => {
    try {
        const postId = Number(req.params.id)

        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        const existingBlocks = post.contentBlocks || {}

        const updated = await prisma.post.update({
            where: { id: postId },
            data: {
                contentBlocks: { ...existingBlocks, featured: !existingBlocks.featured },
            },
            include: ADMIN_INCLUDE,
        })

        res.json(shapeWebinar(updated))
    } catch (error) {
        console.error("Feature webinar error:", error)
        res.status(500).json({ error: "Failed to update featured status" })
    }
}

/**
 * TOGGLE on-demand availability (admin) — stored inside contentBlocks
 */
export const toggleOnDemandWebinar = async (req, res) => {
    try {
        const postId = Number(req.params.id)

        const post = await prisma.post.findUnique({ where: { id: postId } })
        if (!post) {
            return res.status(404).json({ error: "Webinar not found" })
        }

        const existingBlocks = post.contentBlocks || {}

        const updated = await prisma.post.update({
            where: { id: postId },
            data: {
                contentBlocks: { ...existingBlocks, isOnDemand: !existingBlocks.isOnDemand },
            },
            include: ADMIN_INCLUDE,
        })

        res.json(shapeWebinar(updated))
    } catch (error) {
        console.error("On-demand webinar error:", error)
        res.status(500).json({ error: "Failed to update on-demand status" })
    }
}