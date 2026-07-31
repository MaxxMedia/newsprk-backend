import prisma from "../prismaClient.js"
import slugify from "slugify"
import {
  assertCanCreateArticle,
  getArticlePostingEligibility,
} from "../lib/packageContentLimits.js"
import { ARTICLE_TOPIC_SLUGS } from "../lib/topics.js" // 👈 mirror of frontend list, see note below

/**
 * CREATE recruiter article
 */
export const createRecruiterArticle = async (req, res) => {
  try {
    const user = req.user

    if (!user || user.role !== "recruiter") {
      return res.status(403).json({ error: "Only recruiters can create articles" })
    }

    const recruiter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { companyId: true },
    })

    if (!recruiter?.companyId) {
      return res.status(400).json({
        error: "Recruiter must be linked to a company",
      })
    }

    const { title, content, excerpt, imageUrl, badge, categorySlug } = req.body

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" })
    }

    if (!categorySlug) {
      return res.status(400).json({ error: "Please select a topic category" })
    }

    // Whitelist check — recruiters can only post into designated article topics,
    // not into "events", "suppliers", "webinars" etc.
    if (!ARTICLE_TOPIC_SLUGS.includes(categorySlug)) {
      return res.status(400).json({ error: "Invalid topic category" })
    }

    try {
      await assertCanCreateArticle(recruiter.companyId)
    } catch (err) {
      return res.status(err.status || 403).json({
        error: err.message,
        code: err.code,
        eligibility: err.eligibility,
      })
    }

    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    })

    if (!category) {
      return res.status(400).json({
        error: "Selected category does not exist. Contact admin.",
      })
    }

    const slug = `${slugify(title, {
      lower: true,
      strict: true,
      trim: true,
    })}-${Date.now()}`

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        imageUrl,
        badge,
        companyId: recruiter.companyId,
        categoryId: category.id,
        status: "PENDING",
        createdById: user.id,
        publishedAt: null,
      },
      include: {
        category: true,
      },
    })

    return res.status(201).json(post)
  } catch (error) {
    console.error("Create recruiter article error:", error)

    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Slug must be unique" })
    }

    return res.status(500).json({ error: "Internal server error" })
  }
}

export const getArticlePostingEligibilityHandler = async (req, res) => {
  try {
    const user = req.user

    if (!user || user.role !== "recruiter") {
      return res.status(403).json({ error: "Only recruiters allowed" })
    }

    const recruiter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { companyId: true },
    })

    const eligibility = await getArticlePostingEligibility(recruiter?.companyId ?? null)
    res.json(eligibility)
  } catch (error) {
    console.error("Article eligibility error:", error)
    res.status(500).json({ error: "Failed to load article eligibility" })
  }
}

/**
 * GET recruiter's own articles (across ALL topic categories now,
 * not just a single "articles" category)
 */
export const getMyRecruiterArticles = async (req, res) => {
  try {
    const user = req.user

    if (!user || user.role !== "recruiter") {
      return res.status(403).json({ error: "Only recruiters allowed" })
    }

    const recruiter = await prisma.user.findUnique({
      where: { id: user.id },
      select: { companyId: true },
    })

    if (!recruiter?.companyId) {
      return res.json([])
    }

    const posts = await prisma.post.findMany({
      where: {
        companyId: recruiter.companyId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        category: true, // 👈 needed so the edit page can prefill categorySlug
      },
    })

    console.log("ARTICLES FOUND:", posts.length)

    res.json(posts)
  } catch (error) {
    console.error("Fetch recruiter articles error:", error)
    res.status(500).json({ error: "Failed to fetch articles" })
  }
}

/**
 * UPDATE recruiter article (own only)
 */
export const updateRecruiterArticle = async (req, res) => {
  try {
    const user = req.user
    const postId = Number(req.params.id)

    if (!user || user.role !== "recruiter") {
      return res.status(403).json({ error: "Only recruiters allowed" })
    }

    if (!user.companyId) {
      return res.status(400).json({ error: "Recruiter not linked to company" })
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post || post.companyId !== user.companyId) {
      return res.status(404).json({ error: "Article not found" })
    }

    const { title, content, excerpt, imageUrl, badge, categorySlug } = req.body

    let categoryId = undefined

    if (categorySlug) {
      if (!ARTICLE_TOPIC_SLUGS.includes(categorySlug)) {
        return res.status(400).json({ error: "Invalid topic category" })
      }

      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
      })

      if (!category) {
        return res.status(400).json({ error: "Selected category does not exist" })
      }

      categoryId = category.id
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
        excerpt,
        imageUrl,
        badge,
        ...(categoryId !== undefined && { categoryId }),
        ...(title && {
          slug: slugify(title, { lower: true, strict: true }),
        }),
        updatedAt: new Date(),
      },
      include: {
        Company: true,
        category: true,
      },
    })

    return res.json(updatedPost)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * DELETE recruiter article (own only)
 */
export const deleteRecruiterArticle = async (req, res) => {
  try {
    const user = req.user
    const postId = Number(req.params.id)

    if (!user || user.role !== "recruiter") {
      return res.status(403).json({ error: "Only recruiters allowed" })
    }

    if (!user.companyId) {
      return res.status(400).json({ error: "Recruiter not linked to company" })
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post || post.companyId !== user.companyId) {
      return res.status(404).json({ error: "Article not found" })
    }

    await prisma.post.delete({
      where: { id: postId },
    })

    return res.json({ success: true })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: "Internal server error" })
  }
}