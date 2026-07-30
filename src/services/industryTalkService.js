// services/industryTalkService.js

import prisma from "../prismaClient.js";
import slugify from "slugify";

export async function createIndustryTalk(data) {
  let slug =
    data.slug ||
    slugify(data.title, {
      lower: true,
      strict: true,
      trim: true,
    });

  const exists = await prisma.industryTalk.findUnique({
    where: { slug },
  });

  if (exists) {
    slug = `${slug}-${Date.now()}`;
  }

  let resolvedCompanyId = data.companyId || null;
  if (resolvedCompanyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(resolvedCompanyId) },
    });
    if (!company) {
      throw new Error("Company not found");
    }
  } else if (data.companyProfileUrl || data.companyName) {
    const companySlug = data.companyProfileUrl
      ? data.companyProfileUrl
          .replace(/^https?:\/\/[^\/]+/, "")
          .replace(/^\/(?:suppliers|company)\//, "")
          .replace(/\/$/, "")
          .trim()
      : null;

    const comp = await prisma.company.findFirst({
      where: {
        OR: [
          ...(companySlug ? [{ slug: companySlug }] : []),
          ...(data.companyName ? [{ name: { equals: data.companyName, mode: "insensitive" } }] : []),
        ],
      },
      select: { id: true },
    });
    if (comp) resolvedCompanyId = comp.id;
  }

  const publishedAt = data.interviewDate
    ? new Date(data.interviewDate)
    : data.status === "PUBLISHED"
    ? new Date()
    : null;

  const seoKeywordsObj = {
    interviewDate: data.interviewDate || null,
    readingTime: data.readingTime || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    companyProfileUrl: data.companyProfileUrl || null,
    autoplay: data.autoplay ?? false,
    showControls: data.showControls ?? true,
    ...(typeof data.seoKeywords === "object" && data.seoKeywords ? data.seoKeywords : {}),
  };

  return prisma.industryTalk.create({
    data: {
      title: data.title,
      slug,

      interviewType: data.interviewType || null,
      categoryId: data.categoryId || null,
      industryId: data.industryId || null,

      bannerImage: data.bannerImage || null,

      videoType: data.videoType || null,
      videoUrl: data.videoUrl || null,
      uploadedVideo: data.uploadedVideo || null,
      thumbnailUrl: data.thumbnailUrl || null,
      duration: data.duration || null,

      guestName: data.guestName,
      designation: data.designation || null,
      companyName: data.companyName || null,
      companyId: resolvedCompanyId,
      companyLogo: data.companyLogo || null,
      website: data.website || data.companyProfileUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      profileImage: data.profileImage || null,
      shortBio: data.shortBio || null,

      introduction: data.introduction || null,

      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
      seoKeywords: seoKeywordsObj,

      relatedInterviews: data.relatedInterviews || null,

      featured: data.featured ?? false,
      trending: data.trending ?? false,
      homepage: data.homepage ?? false,

      status: data.status ?? "DRAFT",
      publishedAt,

      createdById: Number(data.createdById) || 1,

      questions:
        Array.isArray(data.questions) && data.questions.length > 0
          ? {
              create: data.questions.map((q, idx) => ({
                question: q.question || "",
                answer: q.answer || "",
                videoTimestamp: q.videoTimestamp || null,
                highlightQuote: q.highlightQuote || null,
                displayOrder: q.displayOrder != null ? Number(q.displayOrder) : idx + 1,
              })),
            }
          : undefined,
    },
  });
}

export async function updateIndustryTalk(id, data) {
  const {
    questions,
    interviewDate,
    readingTime,
    tags,
    companyProfileUrl,
    autoplay,
    showControls,
    ...updateData
  } = data;

  let resolvedCompanyId = updateData.companyId || null;
  if (resolvedCompanyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(resolvedCompanyId) },
    });
    if (!company) {
      throw new Error("Company not found");
    }
  } else if (companyProfileUrl || updateData.companyName) {
    const companySlug = companyProfileUrl
      ? companyProfileUrl
          .replace(/^https?:\/\/[^\/]+/, "")
          .replace(/^\/(?:suppliers|company)\//, "")
          .replace(/\/$/, "")
          .trim()
      : null;

    const comp = await prisma.company.findFirst({
      where: {
        OR: [
          ...(companySlug ? [{ slug: companySlug }] : []),
          ...(updateData.companyName ? [{ name: { equals: updateData.companyName, mode: "insensitive" } }] : []),
        ],
      },
      select: { id: true },
    });
    if (comp) resolvedCompanyId = comp.id;
  }

  const seoKeywordsObj = {
    interviewDate: interviewDate || null,
    readingTime: readingTime || null,
    tags: Array.isArray(tags) ? tags : [],
    companyProfileUrl: companyProfileUrl || null,
    autoplay: autoplay ?? false,
    showControls: showControls ?? true,
    ...(typeof updateData.seoKeywords === "object" && updateData.seoKeywords ? updateData.seoKeywords : {}),
  };

  const updatedTalk = await prisma.industryTalk.update({
    where: {
      id: Number(id),
    },

    data: {
      ...updateData,
      companyId: resolvedCompanyId,
      website: updateData.website || companyProfileUrl || undefined,
      seoKeywords: seoKeywordsObj,
      publishedAt: interviewDate
        ? new Date(interviewDate)
        : updateData.status === "PUBLISHED"
        ? new Date()
        : undefined,
    },
  });

  if (Array.isArray(questions)) {
    await prisma.industryTalkQuestion.deleteMany({
      where: { industryTalkId: Number(id) },
    });

    if (questions.length > 0) {
      await prisma.industryTalkQuestion.createMany({
        data: questions.map((q, idx) => ({
          industryTalkId: Number(id),
          question: q.question || "",
          answer: q.answer || "",
          videoTimestamp: q.videoTimestamp || null,
          highlightQuote: q.highlightQuote || null,
          displayOrder: q.displayOrder != null ? Number(q.displayOrder) : idx + 1,
        })),
      });
    }
  }

  return updatedTalk;
}

export async function deleteIndustryTalk(id) {
  return prisma.industryTalk.delete({
    where: {
      id: Number(id),
    },
  });
}

// ✅ FIXED: Use 'industry' (lowercase) - matches Prisma schema
export async function getIndustryTalkById(id) {
  console.log("🔍 Fetching industry talk by ID:", id);
  
  return prisma.industryTalk.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      industry: true, // ✅ lowercase - matches Prisma schema
      Company: {
        include: {
          SupplierDirectory: {
            select: {
              id: true,
              slug: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      questions: {
        orderBy: { displayOrder: "asc" },
      },
      quotes: {
        orderBy: { displayOrder: "asc" },
      },
      gallery: {
        orderBy: { displayOrder: "asc" },
      },
      documents: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });
}

// ✅ FIXED: Use 'industry' (lowercase) - matches Prisma schema
export const getIndustryTalks = async ({ page, limit, search, status }) => {
  const skip = (page - 1) * limit;
  
  const where = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { guestName: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) {
    where.status = status;
  }

  const [data, total] = await Promise.all([
    prisma.industryTalk.findMany({
      where,
      include: {
        industry: { // ✅ lowercase - matches Prisma schema
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        Company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.industryTalk.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// ✅ FIXED: Use 'industry' (lowercase) - matches Prisma schema
export const getIndustryTalkBySlug = async (slug) => {
  console.log("🔍 Fetching industry talk by slug:", slug);
  
  return prisma.industryTalk.findUnique({
    where: { slug },
    include: {
      industry: true, // ✅ lowercase - matches Prisma schema
      Company: {
        include: {
          SupplierDirectory: {
            select: {
              id: true,
              slug: true,
              name: true,
              logoUrl: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      questions: {
        orderBy: { displayOrder: "asc" },
      },
      quotes: {
        orderBy: { displayOrder: "asc" },
      },
      gallery: {
        orderBy: { displayOrder: "asc" },
      },
      documents: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });
};

export async function saveDraft(id) {
  return prisma.industryTalk.update({
    where: {
      id: Number(id),
    },
    data: {
      status: "DRAFT",
    },
  });
}

export async function publishIndustryTalk(id, approvedById) {
  return prisma.industryTalk.update({
    where: {
      id: Number(id),
    },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      approvedById: approvedById,
    },
  });
}

export async function incrementViews(id) {
  console.log("📊 Incrementing views for talk ID:", id);
  
  return prisma.industryTalk.update({
    where: {
      id: Number(id),
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });
}

export async function incrementShares(id) {
  console.log("📊 Incrementing shares for talk ID:", id);
  
  return prisma.industryTalk.update({
    where: {
      id: Number(id),
    },
    data: {
      shares: {
        increment: 1,
      },
    },
  });
}