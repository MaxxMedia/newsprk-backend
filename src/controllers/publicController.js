import prisma from "../prismaClient.js"

/**
 * 🌍 GET all approved articles (PUBLIC)
 * Used by homepage, company articles, sliders, etc.
 */
export const getApprovedArticles = async (req, res) => {
  try {
    const articles = await prisma.post.findMany({
      where: {
        status: "APPROVED",
        category: { slug: "articles" },
        publishedAt: { not: null },
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
    console.error("Public fetch approved articles error:", err)
    res.status(500).json({
      error: "Failed to fetch approved articles",
    })
  }
}
