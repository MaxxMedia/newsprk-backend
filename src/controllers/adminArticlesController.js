import prisma from "../prismaClient.js"

/**
 * GET all pending recruiter articles
 */
export const getPendingArticles = async (req, res) => {
  try {
    const articles = await prisma.post.findMany({
      where: {
        status: "PENDING",
        category: {
          slug: "articles",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        Company: {
          select: {
            id: true,
            name: true,
          },
        },
        User_Post_createdByIdToUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    res.json(articles)
  } catch (err) {
    console.error("Admin fetch pending articles error:", err)
    res.status(500).json({
      error: "Failed to fetch pending articles",
    })
  }
}

/**
 * GET all approved recruiter articles
 */
export const getAdminApprovedArticles = async (req, res) => {
  try {
    const articles = await prisma.post.findMany({
      where: {
        status: "APPROVED",
        category: {
          slug: "articles",
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
      include: {
        Company: {
          select: {
            id: true,
            name: true,
          },
        },
        User_Post_createdByIdToUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    res.json(articles)
  } catch (err) {
    console.error("Admin fetch approved articles error:", err)
    res.status(500).json({
      error: "Failed to fetch approved articles",
    })
  }
}

/**
 * APPROVE article
 */
export const approveArticle = async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId
    const postId = Number(req.params.id)

    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!existingPost) {
      return res.status(404).json({
        error: "Article not found",
      })
    }

    if (existingPost.status !== "PENDING") {
      return res.status(400).json({
        error: "Only pending articles can be approved",
      })
    }

    const post = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        status: "APPROVED",
        approvedById: adminId,
        approvedAt: new Date(),
        publishedAt: new Date(),
      },
    })

    res.json(post)
  } catch (err) {
    console.error("Approve article error:", err)
    res.status(500).json({
      error: "Failed to approve article",
    })
  }
}

/**
 * REJECT article
 */
export const rejectArticle = async (req, res) => {
  try {
    const postId = Number(req.params.id)

    const existingPost = await prisma.post.findUnique({
      where: {
        id: postId,
      },
    })

    if (!existingPost) {
      return res.status(404).json({
        error: "Article not found",
      })
    }

    if (existingPost.status !== "PENDING") {
      return res.status(400).json({
        error: "Only pending articles can be rejected",
      })
    }

    await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        status: "REJECTED",
      },
    })

    res.json({
      success: true,
    })
  } catch (err) {
    console.error("Reject article error:", err)
    res.status(500).json({
      error: "Failed to reject article",
    })
  }
}