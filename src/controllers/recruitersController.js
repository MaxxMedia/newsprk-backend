

import { prisma } from "../lib/prisma.js"
import slugify from "slugify"
import { getPlanLabel } from "../lib/packagePricing.js"
import { getJobPostingEligibility } from "../lib/jobPostingLimits.js"
import {
  getArticlePostingEligibility,
  getProductListingEligibility,
  getCompanyProfileEligibility,
} from "../lib/packageContentLimits.js";
import { dedupeCompanyPurchases, buildSubscriptionDisplay, syncCompanySubscription } from "../lib/packagePurchases.js"
import { buildRecruiterAnalytics } from "../lib/recruiterAnalytics.js"


// ================= PUBLIC RECRUITER PROFILE =================
export async function getRecruiterProfile(req, res) {
  try {
    const { username } = req.params

    const recruiter = await prisma.user.findUnique({
      where: { username },
      select: {
  id: true,
  username: true,
  fullName: true,
  headline: true,
  about: true,
  location: true,
  avatarUrl: true,
  websiteUrl: true,
  role: true,
  createdAt: true,
  Company: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      isVerified: true,
    },
  },
}
    })

    if (!recruiter) {
      return res.status(404).json({ error: "Recruiter not found" })
    }

    if (recruiter.role !== "recruiter") {
      return res.status(403).json({ error: "Not a recruiter profile" })
    }

    res.json(recruiter)
  } catch (err) {
    console.error("Recruiter profile error:", err)
    res.status(500).json({ error: "Failed to fetch recruiter profile" })
  }
}

// ================= MY RECRUITER PROFILE =================
export async function getMyRecruiterProfile(req, res) {
  try {
    const userId = req.user.id // ✅ FIXED

    const recruiter = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        headline: true,
        about: true,
        location: true,
        avatarUrl: true,
        websiteUrl: true,
        role: true,
        createdAt: true,
        Company: {
  select: {
    id: true,
    name: true,
    slug: true,
    tagline: true,
    description: true,
    industryId: true,
    location: true,
    address: true,
    companySize: true,
    website: true,
    logoUrl: true,
    coverImageUrl: true,
    isVerified: true,
  },
}
      },
    })

    if (!recruiter) {
      return res.status(404).json({ error: "Recruiter not found" })
    }

    if (recruiter.role !== "recruiter") {
      return res.status(403).json({ error: "Not a recruiter" })
    }

    res.json(recruiter)
  } catch (err) {
    console.error("My recruiter profile error:", err)
    res.status(500).json({ error: "Failed to fetch recruiter profile" })
  }
}

export async function getCompanyProfileEligibilityController(req, res) {
  try {
    const recruiter = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      select: {
        companyId: true,
      },
    });

    const eligibility = await getCompanyProfileEligibility(
      recruiter?.companyId ?? null
    );

    res.json(eligibility);
  } catch (err) {
    console.error("Company profile eligibility error:", err);
    res.status(500).json({
      error: "Failed to load company profile eligibility",
    });
  }
}

// ================= RECRUITER DASHBOARD =================

const JOB_LISTING_DAYS = 30
const EXPIRY_WARN_DAYS = 7

async function buildRecentActivity(recruiterId, applicationsCount) {
  const activities = []

  if (applicationsCount > 0) {
    activities.push({
      id: "view-applicants",
      type: "action",
      message: `Review ${applicationsCount} applicant${applicationsCount !== 1 ? "s" : ""}`,
      href: "/recruiter/jobs",
      color: "blue",
      createdAt: new Date().toISOString(),
    })
  }

  const recentApps = await prisma.jobApplication.findMany({
    where: {
      Job: { postedById: recruiterId },
      status: "applied",
      createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      User: { select: { fullName: true, username: true } },
      Job: { select: { id: true, title: true } },
    },
  })

  for (const app of recentApps) {
    const name = app.User.fullName || app.User.username || "A candidate"
    activities.push({
      id: `app-${app.id}`,
      type: "new_application",
      message: `${name} applied to ${app.Job.title}`,
      href: `/recruiter/jobs/${app.Job.id}/applications`,
      color: "blue",
      createdAt: app.createdAt.toISOString(),
    })
  }

  const recentShortlisted = await prisma.jobApplication.findMany({
    where: {
      status: "shortlisted",
      Job: { postedById: recruiterId },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      User: { select: { fullName: true, username: true } },
      Job: { select: { id: true, title: true } },
    },
  })

  for (const app of recentShortlisted) {
    const name = app.User.fullName || app.User.username || "A candidate"
    activities.push({
      id: `shortlist-${app.id}`,
      type: "shortlisted",
      message: `${name} shortlisted for ${app.Job.title}`,
      href: `/recruiter/jobs/${app.Job.id}/applications`,
      color: "green",
      createdAt: app.createdAt.toISOString(),
    })
  }

  const now = Date.now()
  const expiringJobs = await prisma.job.findMany({
    where: { postedById: recruiterId, isActive: true },
    select: { id: true, title: true, createdAt: true },
  })

  for (const job of expiringJobs) {
    const ageDays = Math.floor(
      (now - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    const daysLeft = JOB_LISTING_DAYS - ageDays
    if (daysLeft > 0 && daysLeft <= EXPIRY_WARN_DAYS) {
      activities.push({
        id: `expiry-${job.id}`,
        type: "job_expiring",
        message: `"${job.title}" expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        href: `/recruiter/jobs/${job.id}/edit`,
        color: "orange",
        createdAt: job.createdAt.toISOString(),
      })
    }
  }

  const pendingDirs = await prisma.supplierDirectory.findMany({
    where: { submittedById: recruiterId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, name: true, createdAt: true },
  })

  for (const dir of pendingDirs) {
    activities.push({
      id: `dir-${dir.id}`,
      type: "directory_pending",
      message: `"${dir.name}" directory pending approval`,
      href: "/recruiter/directories",
      color: "yellow",
      createdAt: dir.createdAt.toISOString(),
    })
  }

  const pendingArticles = await prisma.post.findMany({
    where: {
      createdById: recruiterId,
      status: "PENDING",
      category: { slug: "articles" },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { id: true, title: true, createdAt: true },
  })

  for (const article of pendingArticles) {
    activities.push({
      id: `article-${article.id}`,
      type: "article_pending",
      message: `Article "${article.title}" awaiting approval`,
      href: `/recruiter/articles/${article.id}/edit`,
      color: "yellow",
      createdAt: article.createdAt.toISOString(),
    })
  }

  return activities
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
}

export async function getRecruiterDashboard(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const recruiterId = req.user.id

    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterId },
      select: {
        companyId: true,
        Company: {
          select: {
            subscriptionPlan: true,
            subscriptionExpiresAt: true,
            jobPostingCredits: true,
          },
        },
      },
    })

    const jobsCount = await prisma.job.count({
      where: {
        postedById: recruiterId,
        isActive: true,
      },
    })

    const applicationsCount = await prisma.jobApplication.count({
      where: {
        Job: {
          postedById: recruiterId,
        },
      },
    })

    const shortlistedCount = await prisma.jobApplication.count({
      where: {
        status: "shortlisted",
        Job: {
          postedById: recruiterId,
        },
      },
    })

   const recentJobsRaw = await prisma.job.findMany({
  where: {
    postedById: recruiterId,
    isActive: true,
  },
  orderBy: { createdAt: "desc" },
  take: 5,
  select: {
    id: true,
    title: true,
    _count: {
      select: {
        JobApplication: true,
      },
    },
  },
})

const recentJobs = recentJobsRaw.map(job => ({
  id: job.id,
  title: job.title,
  applications: job._count.JobApplication,
}))

const articles = await prisma.post.findMany({
  where: {
    category: {
      slug: "articles",
    },
    ...(recruiter?.companyId
      ? { companyId: recruiter.companyId }
      : { createdById: recruiterId }),
  },
  orderBy: {
    createdAt: "desc",
  },
  take: 5,
  select: {
    id: true,
    title: true,
    status: true,
    createdAt: true,
  },
})

    const directories = await prisma.supplierDirectory.findMany({
      where: recruiter?.companyId
        ? {
            OR: [
              { companyId: recruiter.companyId },
              { submittedById: recruiterId },
            ],
          }
        : { submittedById: recruiterId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        isLiveEditable: true,
        createdAt: true,
      },
    })

    const recentPurchases = dedupeCompanyPurchases(
      await prisma.packagePurchase.findMany({
        where: recruiter?.companyId
          ? { companyId: recruiter.companyId, status: "PAID" }
          : { userId: recruiterId, status: "PAID" },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          packageType: true,
          packageId: true,
          packageName: true,
          amount: true,
          status: true,
          createdAt: true,
          expiresAt: true,
        },
      })
    )

    const recentActivity = await buildRecentActivity(
      recruiterId,
      applicationsCount
    )

    if (recruiter?.companyId) {
      await syncCompanySubscription(recruiter.companyId)
    }

    const jobPosting = await getJobPostingEligibility(recruiter?.companyId ?? null)
    const articlePosting = await getArticlePostingEligibility(recruiter?.companyId ?? null)
    const productListings = await getProductListingEligibility(recruiter?.companyId ?? null)
    const analytics = await buildRecruiterAnalytics(recruiterId, recruiter?.companyId ?? null)

    const subscription = recruiter?.Company
      ? await buildSubscriptionDisplay(recruiter.Company, recruiter.companyId, prisma)
      : {
          plan: "free",
          planLabel: "Free",
          displayPlan: "free",
          displayPlanLabel: "Free",
          recruitmentExpiresAt: null,
          expiresAt: null,
          jobPostingCredits: 0,
          basePlanLabel: "Free",
        }

    res.json({
      jobsCount,
      applicationsCount,
      shortlistedCount,
      recentJobs,
      articles,
      directories,
      recentActivity,
      subscription,
      recentPurchases,
      jobPosting,
      articlePosting,
      productListings,
      analytics,
    })
  } catch (err) {
    console.error("Recruiter dashboard error:", err)
    res.status(500).json({ error: "Failed to load dashboard" })
  }
}


// ================= UPDATE RECRUITER PROFILE =================
export async function updateRecruiterProfile(req, res) {
  try {
    const userId = req.user.id

    const {
      fullName,
      headline,
      about,
      location,
      websiteUrl,
      avatarUrl,
      companyId: bodyCompanyId,

      companyName,
      companyTagline,
      companyDescription,
      companyIndustryId,
      companyLocation,
      companyAddress,
      companySize,
      companyWebsite,
      companyLogoUrl,
      companyCoverImageUrl,
    } = req.body

    const recruiter = await prisma.user.findUnique({
      where: { id: userId },
      include: { Company: true },
    })

    if (!recruiter) {
      return res.status(404).json({ error: "User not found" })
    }

    /* ================= SAFE USER UPDATE ================= */

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(headline && { headline }),
        ...(about && { about }),
        ...(location && { location }),
        ...(websiteUrl && { websiteUrl }),
        ...(avatarUrl && { avatarUrl }),
        isOnboarded: true,
      },
    })

    let companyId = recruiter.companyId

    /* ================= SAFE COMPANY UPDATE ================= */

    if (!companyId && bodyCompanyId) {
      const linkedCompany = await prisma.company.findUnique({
        where: { id: Number(bodyCompanyId) },
      })

      if (!linkedCompany) {
        return res.status(400).json({ error: "Company not found" })
      }

      await prisma.user.update({
        where: { id: userId },
        data: { companyId: linkedCompany.id },
      })

      companyId = linkedCompany.id
    }

    if (companyId) {

  await assertCompanyProfileLimits(companyId, {
    companyDescription,
    companyCoverImageUrl,
  });

  await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(companyName && { name: companyName }),
      ...(companyTagline && { tagline: companyTagline }),
      ...(companyDescription && { description: companyDescription }),
      ...(companyIndustryId && { industryId: Number(companyIndustryId) }),
      ...(companyLocation && { location: companyLocation }),
      ...(companyAddress && { address: companyAddress }),
      ...(companySize && { companySize }),
      ...(companyWebsite && { website: companyWebsite }),
      ...(companyLogoUrl && { logoUrl: companyLogoUrl }),
      ...(companyCoverImageUrl && { coverImageUrl: companyCoverImageUrl }),
    },
  });
} else if (companyName?.trim()) {
      const baseSlug = slugify(companyName, {
        lower: true,
        strict: true,
        trim: true,
      })

      let slug = baseSlug
      let count = 1

      while (await prisma.company.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${count++}`
      }

      const newCompany = await prisma.company.create({
        data: {
          name: companyName.trim(),
          slug,
          tagline: companyTagline || null,
          description: companyDescription || null,
          industryId: companyIndustryId
            ? Number(companyIndustryId)
            : null,
          location: companyLocation || null,
          address: companyAddress || null,
          companySize: companySize || null,
          website: companyWebsite || null,
          logoUrl: companyLogoUrl || null,
          coverImageUrl: companyCoverImageUrl || null,
        },
      })

      await prisma.user.update({
        where: { id: userId },
        data: { companyId: newCompany.id },
      })

      companyId = newCompany.id
    }

    /* ================= RETURN UPDATED DATA ================= */

    const updatedRecruiter = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        headline: true,
        about: true,
        location: true,
        avatarUrl: true,
        websiteUrl: true,
        role: true,
        Company: {
          select: {
            id: true,
            name: true,
            slug: true,
            tagline: true,
            description: true,
            industryId: true,
            location: true,
            address: true,
            companySize: true,
            website: true,
            logoUrl: true,
            coverImageUrl: true,
          },
        },
      },
    })

    res.json(updatedRecruiter)

  } catch (err) {
  console.error("Update recruiter profile error:", err);

  if (err.status) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
  }

  res.status(500).json({
    error: "Failed to update profile",
  });
}
}

export async function getRecruitersByCompany(req, res) {
  try {
    const { companyId } = req.query

    if (!companyId) {
      return res.status(400).json({ error: "CompanyId required" })
    }

    const recruiters = await prisma.user.findMany({
      where: {
        role: "recruiter",
        companyId: Number(companyId),
      },
      select: {
        id: true,
        email: true,
        username: true,
        companyId: true,
      },
    })

    res.json(recruiters)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch recruiters" })
  }
}


export async function getAllRecruiters(req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin only" })
    }

    const recruiters = await prisma.user.findMany({
      where: {
        role: "recruiter",
      },
      include: {
        Company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    res.json(recruiters)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch recruiters" })
  }
}
