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

  // ✅ Validate company if companyId is provided
  if (data.companyId) {
    const company = await prisma.company.findUnique({
      where: {
        id: data.companyId, // Now using string (UUID)
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }
  }

  return prisma.industryTalk.create({
    data: {
      title: data.title,
      slug,

      interviewType: data.interviewType,
      categoryId: data.categoryId,
      industryId: data.industryId,

      bannerImage: data.bannerImage,

      videoType: data.videoType,
      videoUrl: data.videoUrl,
      uploadedVideo: data.uploadedVideo,
      thumbnailUrl: data.thumbnailUrl,
      duration: data.duration,

      guestName: data.guestName,
      designation: data.designation,
      companyName: data.companyName,
      
      // ✅ Convert companyId to string (for UUID) or null
      companyId: data.companyId || null,
      
      companyLogo: data.companyLogo,
      website: data.website,
      linkedinUrl: data.linkedinUrl,
      profileImage: data.profileImage,
      shortBio: data.shortBio,

      introduction: data.introduction,

      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      seoKeywords: data.seoKeywords,

      relatedInterviews: data.relatedInterviews,

      featured: data.featured ?? false,
      trending: data.trending ?? false,
      homepage: data.homepage ?? false,

      status: data.status ?? "DRAFT",

      createdById: data.createdById,
    },
  });
}

export async function updateIndustryTalk(id, data) {
  // ✅ Validate company if companyId is provided
  if (data.companyId) {
    const company = await prisma.company.findUnique({
      where: {
        id: data.companyId,
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }
  }

  return prisma.industryTalk.update({
    where: {
      id, // Now using string (UUID)
    },

    data: {
      ...data,
      // ✅ Ensure companyId is properly set
      companyId: data.companyId || null,
    },
  });
}

export async function deleteIndustryTalk(id) {
  return prisma.industryTalk.delete({
    where: {
      id, // Now using string (UUID)
    },
  });
}

export async function getIndustryTalkById(id) {
  return prisma.industryTalk.findUnique({
    where: {
      id, // Now using string (UUID)
    },

    include: {
      questions: {
        orderBy: {
          displayOrder: "asc",
        },
      },

      quotes: {
        orderBy: {
          displayOrder: "asc",
        },
      },

      gallery: {
        orderBy: {
          displayOrder: "asc",
        },
      },

      documents: {
        orderBy: {
          displayOrder: "asc",
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
    },
  });
}

export async function getIndustryTalkBySlug(slug) {
  return prisma.industryTalk.findUnique({
    where: {
      slug,
    },

    include: {
      questions: {
        orderBy: {
          displayOrder: "asc",
        },
      },

      quotes: {
        orderBy: {
          displayOrder: "asc",
        },
      },

      gallery: {
        orderBy: {
          displayOrder: "asc",
        },
      },

      documents: {
        orderBy: {
          displayOrder: "asc",
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
    },
  });
}

export async function getIndustryTalks({
  page = 1,
  limit = 10,
  search,
  status,
}) {
  const skip = (page - 1) * limit;
  const take = Number(limit);

  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      {
        title: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        guestName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        companyName: {
          contains: search,
          mode: "insensitive",
        },
      },
      // ✅ Search by related company name too
      {
        Company: {
          is: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.industryTalk.findMany({
      where,
      skip,
      take,

      include: {
        Company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.industryTalk.count({
      where,
    }),
  ]);

  return {
    items,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
  };
}

export async function publishIndustryTalk(id, approvedById) {
  return prisma.industryTalk.update({
    where: {
      id, // Now using string (UUID)
    },

    data: {
      status: "PUBLISHED",
      approvedById,
      publishedAt: new Date(),
    },
  });
}

export async function saveDraft(id) {
  return prisma.industryTalk.update({
    where: {
      id, // Now using string (UUID)
    },

    data: {
      status: "DRAFT",
    },
  });
}

export async function incrementViews(id) {
  return prisma.industryTalk.update({
    where: {
      id, // Now using string (UUID)
    },

    data: {
      views: {
        increment: 1,
      },
    },
  });
}

export async function incrementShares(id) {
  return prisma.industryTalk.update({
    where: {
      id, // Now using string (UUID)
    },

    data: {
      shares: {
        increment: 1,
      },
    },
  });
}