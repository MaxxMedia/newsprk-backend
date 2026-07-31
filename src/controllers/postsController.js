// src/controllers/postsController.js
import prisma from "../prismaClient.js";
import * as industryTalkService from "../services/industryTalkService.js";

/**
 * GET /api/posts
 * Supports:
 * - ?page, ?limit
 * - ?q (search)
 * - ?category (slug)
 * - ?author (id)
 */
export const getAllPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "10")));
    const q = req.query.q || "";
    const category = req.query.category || null;
    const author = req.query.author ? Number(req.query.author) : null;
    const isAdmin = req.query.admin === "true";
    const statusParam = req.query.status || null; // "published" | "draft"

    let publishCondition = {};
    if (isAdmin) {
      if (statusParam === "published") {
        publishCondition = { publishedAt: { not: null } };
      } else if (statusParam === "draft") {
        publishCondition = { publishedAt: null };
      }
    } else {
      // Public request: ONLY return published posts
      publishCondition = { publishedAt: { not: null, lte: new Date() } };
    }

    const where = {
      AND: [
        publishCondition,
        { status: "APPROVED" }, // ✅ Only show approved posts
        { publishedAt: { not: null, lte: new Date() } }, // ✅ Only published
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { excerpt: { contains: q, mode: "insensitive" } },
                { content: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        category
          ? {
              category: {
                is: { slug: category },
              },
            }
          : {},
        author ? { authorId: author } : {},
      ],
    };

    where.AND = where.AND.filter((c) => Object.keys(c).length);

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: { author: true, category: true },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    res.json({
      data,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/posts/:id
export const getPostById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = Number(rawId);

    // Guard: reject anything that isn't a valid positive integer BEFORE
    // it ever reaches Prisma. Without this, a non-numeric value (e.g. a
    // slug accidentally sent to this route) becomes NaN, and Prisma's
    // query engine reports that as "Argument `id` is missing." instead
    // of a clear type error — which is what was crashing/logging above.
    if (!rawId || !Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: { author: true, category: true, comments: true },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Strips HTML tags AND decodes the common entities that survive the
// strip (the frontend renders excerpt/bio as plain text, not via
// dangerouslySetInnerHTML, so raw "&nbsp;"/"<p>" must not leak through).
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------
// Reshape a Prisma IndustryTalk record into the same shape the
// frontend's PostDetailsPage expects from a Post (title, slug,
// excerpt, content, imageUrl, author{}, category{}, youtubeUrl,
// views, shares, qa[]).
// ---------------------------------------------------------------
function industryTalkToPostShape(talk) {
  const plainIntro = stripHtml(talk.introduction);
  const keywords = talk.seoKeywords && typeof talk.seoKeywords === "object" ? talk.seoKeywords : {};
  const rTime = talk.readingTime || keywords.readingTime;
  const compUrl = talk.companyProfileUrl || keywords.companyProfileUrl || talk.website || null;

  return {
    id: talk.id,
    title: talk.title,
    slug: talk.slug,
    excerpt: plainIntro ? plainIntro.slice(0, 220) : null,
    content: talk.introduction || null,
    contentBlocks: null, // Industry talks don't use blocks
    imageUrl: talk.bannerImage || talk.thumbnailUrl || null,
    publishedAt: talk.publishedAt || keywords.interviewDate || talk.createdAt,
    views: talk.views,
    shares: talk.shares,
    youtubeUrl: talk.videoType === "youtube" ? talk.videoUrl : null,
    videoCaption: null,
    readTime: rTime ? `${rTime} min read` : null,
    companyId: talk.companyId || null,
    Company: talk.Company || null,
    companyName: talk.companyName || null,
    companyLogo: talk.companyLogo || null,
    companyProfileUrl: compUrl,
    guestName: talk.guestName,
    guestPhoto: talk.profileImage || null,
    designation: talk.designation || null,
    shortBio: stripHtml(talk.shortBio) || null,
    author: {
      id: talk.id,
      name: talk.guestName,
      bio: stripHtml(talk.shortBio) || null,
      avatarUrl: talk.profileImage || null,
      role: talk.designation || null,
      company: talk.companyName || null,
      profileUrl: compUrl,
    },
    category: {
      id: 0,
      name: "Industry Talks",
      slug: "industry-talks",
    },
    qa: Array.isArray(talk.questions)
      ? talk.questions.map((q) => ({
          question: q.question,
          answer: q.answer || "",
        }))
      : [],
  };
}

// GET /api/posts/slug/:slug
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const post = await prisma.post.findUnique({
      where: { slug },
      include: { author: true, category: true, comments: true },
    });

    if (post) return res.json(post);

    // Fallback: not a regular Post, check IndustryTalk by the same slug
    const talk = await industryTalkService.getIndustryTalkBySlug(slug);
    if (talk) return res.json(industryTalkToPostShape(talk));

    return res.status(404).json({ error: "Post not found" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getRecruiterArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params

    const article = await prisma.post.findFirst({
      where: {
        slug,
        status: "APPROVED",
        publishedAt: { not: null },
        category: { slug: "articles" },
      },
      include: {
        company: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    if (!article) {
      return res.status(404).json({ error: "Article not found" })
    }

    res.json(article)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch article" })
  }
}

// GET /api/posts/featured
export const getFeaturedPosts = async (req, res) => {
  try {
    const trendingPosts = await prisma.post.findMany({
      where: { category: { slug: "trending" } },
      include: { author: true, category: true },
      orderBy: { publishedAt: "desc" },
      take: 2,
    });
    res.json({ data: trendingPosts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch featured posts" });
  }
};

// GET /api/posts/popular
export const getPopularPosts = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "5"), 20);
    
    const popularPosts = await prisma.post.findMany({
      where: {
        status: "APPROVED",  // ✅ Only approved posts
        publishedAt: { 
          not: null,
          lte: new Date() // ✅ Only published posts (not future)
        }
      },
      include: { 
        author: true, 
        category: true 
      },
      orderBy: { 
        views: "desc"  // ✅ Sort by views (highest first)
      },
      take: limit,
    });
    
    res.json({ 
      data: popularPosts,
      meta: {
        total: popularPosts.length,
        limit
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch popular posts" });
  }
};

// POST /api/posts
export const createPost = async (req, res) => {
  try {
    const {
      title,
      slug,
      badge,
      excerpt,
      content,
      contentBlocks, // ✅ NEW: Block-based content
      imageUrl,
      authorId,
      categoryId,
      publishedAt,

      // Social & Contact fields
      facebookUrl,
      linkedinUrl,
      twitterUrl,
      youtubeUrl,
      email,
      whatsappNumber,
    } = req.body;

    if (!title || !slug || !authorId || !categoryId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate content - either content or contentBlocks must exist
    if (!content && (!contentBlocks || !contentBlocks.length)) {
      return res.status(400).json({
        error: "Either content or contentBlocks is required",
      });
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        badge,
        excerpt,
        content: content || "", // Keep for backward compatibility
        contentBlocks: contentBlocks || [], // ✅ Store blocks
        imageUrl,

        // Social & Contact fields
        facebookUrl,
        linkedinUrl,
        twitterUrl,
        youtubeUrl,
        email,
        whatsappNumber,

        authorId: Number(authorId),
        categoryId: Number(categoryId),
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        status: "APPROVED", // Default status
      },
      include: { author: true, category: true },
    });

    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Slug must be unique" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/posts/:id
export const updatePost = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = { ...req.body };

    if (!req.params.id || !Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    const {
      title,
      slug,
      badge,
      excerpt,
      content,
      contentBlocks, // ✅ NEW: Block-based content
      imageUrl,
      authorId,
      categoryId,
      publishedAt,

      // Social & Contact fields
      facebookUrl,
      linkedinUrl,
      twitterUrl,
      youtubeUrl,
      email,
      whatsappNumber,
    } = req.body;

    // Build update data
    const updateData = {
      title,
      slug,
      badge,
      excerpt,
      content: content || "",
      contentBlocks: contentBlocks || [], // ✅ Update blocks
      imageUrl,
      facebookUrl,
      linkedinUrl,
      twitterUrl,
      youtubeUrl,
      email,
      whatsappNumber,
    };

    // Only include if provided
    if (authorId) updateData.authorId = Number(authorId);
    if (categoryId) updateData.categoryId = Number(categoryId);
    if (publishedAt) updateData.publishedAt = new Date(publishedAt);

    if (data.isPublished !== undefined) {
      if (data.isPublished) {
        data.publishedAt = new Date();
        data.status = "APPROVED";
      } else {
        data.publishedAt = null;
        data.status = "PENDING";
      }
      delete data.isPublished;
    }

    if (data.isPublished !== undefined) {
      if (data.isPublished) {
        data.publishedAt = new Date();
        data.status = "APPROVED";
      } else {
        data.publishedAt = null;
        data.status = "PENDING";
      }
      delete data.isPublished;
    }

    const updated = await prisma.post.update({
      where: { id },
      data: updateData,
      include: { author: true, category: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Slug must be unique" });
    }
    res.status(400).json({ error: err.message });
  }
};

// DELETE /api/posts/:id
export const deletePost = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!req.params.id || !Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid post id" });
    }

    await prisma.post.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const incrementPostView = async (req, res) => {
  try {
    const { slug } = req.params;

    try {
      const post = await prisma.post.update({
        where: { slug },
        data: { views: { increment: 1 } },
        select: { views: true },
      });
      return res.json({ success: true, views: post.views });
    } catch (postErr) {
      const talk = await prisma.industryTalk.update({
        where: { slug },
        data: { views: { increment: 1 } },
        select: { views: true },
      });
      return res.json({ success: true, views: talk.views });
    }
  } catch (err) {
    console.error("View increment error:", err);
    res.status(404).json({ success: false, message: "Post or Talk not found" });
  }
};

export const incrementPostShare = async (req, res) => {
  try {
    const { slug } = req.params;

    try {
      await prisma.post.update({
        where: { slug },
        data: {
          shares: { increment: 1 },
        },
      });
      return res.json({ success: true });
    } catch (postErr) {
      await prisma.industryTalk.update({
        where: { slug },
        data: {
          shares: { increment: 1 },
        },
      });
      return res.json({ success: true });
    }
  } catch (err) {
    console.error("Share increment error:", err);
    res.status(500).json({ error: "Failed to increment share" });
  }
};