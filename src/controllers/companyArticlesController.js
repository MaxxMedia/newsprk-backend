import { hiddenPostIds } from "../lib/companyPlanVisibility.js";
import prisma from "../prismaClient.js"

export const getCompanyArticles = async (req, res) => {
  try {
    const companyId = Number(req.params.companyId)

    const articles = await prisma.post.findMany({
      where: {
        id: { notIn: await hiddenPostIds(prisma) },
        companyId,
        status: "APPROVED",          // ✅ admin approved
        publishedAt: { not: null },  // ✅ public
        category: {
          slug: "articles",          // ✅ ONLY articles
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        imageUrl: true,
        publishedAt: true,
      },
    })

    res.json(articles)
  } catch (err) {
    console.error("Company articles error:", err)
    res.status(500).json({ error: "Failed to fetch company articles" })
  }
}
