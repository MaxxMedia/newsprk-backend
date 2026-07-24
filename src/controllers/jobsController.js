import { prisma } from "../lib/prisma.js";
import {
  assertCanPostByType,
  getJobPostingEligibility,
  getInternshipPostingEligibility,
} from "../lib/jobPostingLimits.js";
import {
  enforceCompanyJobVisibility,
  filterJobsForPackageVisibility,
  isJobPackageVisible,
} from "../lib/jobVisibility.js";

/**
 * Recruiter/Admin: create job
 */
export async function createJob(req, res) {
  try {
    if (!["recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Not allowed" })
    }

    let companyId = null
    let companyName = null
    let isExternal = false
    let companyPlan = null
    let companyPlanExpiresAt = null

    // 🔹 Recruiter → Internal Job
    if (req.user.role === "recruiter") {
      const recruiter = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          companyId: true,
          Company: {
            select: {
              subscriptionPlan: true,
              subscriptionExpiresAt: true,
            },
          },
        },
      })

      if (!recruiter?.companyId) {
        return res.status(400).json({
          error: "Recruiter is not linked to any company",
        })
      }

      companyId = recruiter.companyId
      companyPlan = recruiter.Company?.subscriptionPlan
      companyPlanExpiresAt = recruiter.Company?.subscriptionExpiresAt
      isExternal = false

      try {
        await assertCanPostByType(companyId, req.body.employmentType)
      } catch (limitErr) {
        return res.status(limitErr.status || 403).json({
          error: limitErr.message,
          code: limitErr.code,
          eligibility: limitErr.eligibility,
        })
      }
    }

    // 🔹 Admin → External Job
    if (req.user.role === "admin") {
      companyName = req.body.companyName
      isExternal = true

      if (!req.body.applyUrl && !req.body.linkedinUrl) {
        return res.status(400).json({
          error: "External job must have applyUrl or linkedinUrl",
        })
      }
    }

    /* ================= FEATURED ELIGIBILITY ================= */

    const requestedFeatured = Boolean(req.body.isFeatured)
    let isFeatured = false

    if (requestedFeatured) {
      const FEATURED_ELIGIBLE_PLANS = ["professional", "enterprise"]
      const plan = (companyPlan || "free").toLowerCase()

      const isEligiblePlan = FEATURED_ELIGIBLE_PLANS.includes(plan)
      const isPlanActive =
        !companyPlanExpiresAt || new Date(companyPlanExpiresAt) > new Date()

      if (!isEligiblePlan || !isPlanActive) {
        return res.status(403).json({
          error: "Featured jobs are only available on Professional and Enterprise plans",
          code: "PLAN_NOT_ELIGIBLE",
          currentPlan: plan,
        })
      }

      // Admin-posted external jobs have no companyId/plan to check against —
      // decide separately if admins should be allowed to feature freely.
      isFeatured = true
    }

    const job = await prisma.job.create({
      data: {
        // Basic
        title: req.body.title,
        slug: req.body.slug,
        description: req.body.description,
        responsibilities: req.body.responsibilities,
        requirements: req.body.requirements,
        aboutCompany: req.body.aboutCompany,

        // Company
        companyId,
        companyName,
        companyWebsite: req.body.companyWebsite,
        companySize: req.body.companySize,
        industry: req.body.industry,
        department: req.body.department,
        reportsTo: req.body.reportsTo,

        // Employment
        employmentType: req.body.employmentType,
        workplaceType: req.body.workplaceType,
        jobFunction: req.body.jobFunction,
        seniorityLevel: req.body.seniorityLevel,
        employmentMode: req.body.employmentMode,
        shift: req.body.shift,

        // Experience
        experience: req.body.experience,
        minExperience: req.body.minExperience
          ? Number(req.body.minExperience)
          : null,
        maxExperience: req.body.maxExperience
          ? Number(req.body.maxExperience)
          : null,
        education: req.body.education,
        noticePeriod: req.body.noticePeriod,

        // Location
        location: req.body.location,
        country: req.body.country,
        state: req.body.state,
        city: req.body.city,
        zipCode: req.body.zipCode,

        isRemote: req.body.isRemote ?? false,
        isHybrid: req.body.isHybrid ?? false,

        // Salary
        salaryMin: req.body.salaryMin
          ? Number(req.body.salaryMin)
          : null,
        salaryMax: req.body.salaryMax
          ? Number(req.body.salaryMax)
          : null,
        salaryCurrency: req.body.salaryCurrency || "INR",
        salaryPeriod: req.body.salaryPeriod,
        showSalary: req.body.showSalary ?? true,

        // Hiring
        openings: req.body.openings
          ? Number(req.body.openings)
          : 1,

        applicationDeadline: req.body.applicationDeadline
          ? new Date(req.body.applicationDeadline)
          : null,

        expectedJoiningDate: req.body.expectedJoiningDate
          ? new Date(req.body.expectedJoiningDate)
          : null,

        // JSON fields
        skills: req.body.skills ?? [],
        preferredSkills: req.body.preferredSkills ?? [],
        benefits: req.body.benefits ?? [],
        languages: req.body.languages ?? [],

        // Recruiter
        recruiterName: req.body.recruiterName,
        recruiterEmail: req.body.recruiterEmail,
        recruiterPhone: req.body.recruiterPhone,

        // Extras
        referralBonus: req.body.referralBonus
          ? Number(req.body.referralBonus)
          : null,

        travelRequired: req.body.travelRequired ?? false,
        relocationSupport: req.body.relocationSupport ?? false,
        visaSponsorship: req.body.visaSponsorship ?? false,

        // Apply
        applyUrl: req.body.applyUrl,
        linkedinUrl: req.body.linkedinUrl,
        isExternal,

        // Settings
        requireResume: req.body.requireResume ?? true,
        requireCoverLetter: req.body.requireCoverLetter ?? false,
        requirePortfolio: req.body.requirePortfolio ?? false,
        requireLinkedin: req.body.requireLinkedin ?? false,
        allowEasyApply: req.body.allowEasyApply ?? true,

        // SEO
        metaTitle: req.body.metaTitle,
        metaDescription: req.body.metaDescription,
        keywords: req.body.keywords ?? [],

        // Status
        postedById: req.user.id,
        isFeatured,
        featuredAt: isFeatured ? new Date() : null,
      }
    })

    if (companyId) {
      await enforceCompanyJobVisibility(companyId)
    }

    res.json(job)
  } catch (err) {
    console.error("JOB CREATE ERROR:", err)
    res.status(500).json({ error: err.message })
  }
}

export async function getPostingEligibility(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const recruiter = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true },
    })

    const jobEligibility = await getJobPostingEligibility(recruiter?.companyId ?? null)
    const internshipEligibility = await getInternshipPostingEligibility(recruiter?.companyId ?? null)

    // 🔹 Top-level fields stay identical to before (job eligibility) so any
    // existing frontend code keeps working unchanged. Both are also nested
    // explicitly under `job` / `internship` for the new Job Type-aware UI.
    res.json({
      ...jobEligibility,
      job: jobEligibility,
      internship: internshipEligibility,
    })
  } catch (err) {
    console.error("Posting eligibility error:", err)
    res.status(500).json({ error: "Failed to check job posting eligibility" })
  }
}

/**
 * Public: list jobs (for feed) - WITH PAGINATION
 */
export async function getAllJobs(req, res) {
  try {
    // 🔥 Get pagination params from query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // 🔥 Get total count of active jobs (before pagination)
    const totalJobs = await prisma.job.count({
      where: {
        isActive: true,
      },
    })

    // 🔥 Get paginated jobs
    const jobs = await prisma.job.findMany({
      where: {
        isActive: true,
      },
      include: {
        Company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        User: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: skip,
    })

    // 🔥 Apply visibility filtering
    const visibleJobs = await filterJobsForPackageVisibility(jobs)

    // 🔥 Calculate pagination metadata
    const totalPages = Math.ceil(totalJobs / limit)

    // 🔥 Return paginated response
    res.json({
      jobs: visibleJobs,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalJobs: totalJobs,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    })
  } catch (err) {
    console.error("GET JOBS ERROR:", err)
    res.status(500).json({
      error: err.message
    })
  }
}

/**
 * Public: job detail by slug
 */
export async function getJobBySlug(req, res) {
  try {
   const job = await prisma.job.findUnique({
  where: { slug: req.params.slug },
  include: {
    Company: {
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
      },
    },
    User: {
      select: {
        id: true,
        email: true,
      },
    },
  },
});

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (!job.isActive) {
      return res.status(404).json({ error: "Job not found" });
    }

    const visible = await isJobPackageVisible(job);
    if (!visible) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (err) {
  console.error("GET JOB ERROR:", err)
  res.status(500).json({
    error: err.message
  })
}
}

export async function getJobsByRecruiter(req, res) {
  try {
    const { username } = req.params

    const recruiter = await prisma.user.findUnique({
      where: { username },
    })

    if (!recruiter || recruiter.role !== "recruiter") {
      return res.json([])
    }

    const jobs = await prisma.job.findMany({
      where: {
        postedById: recruiter.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const visibleJobs = await filterJobsForPackageVisibility(jobs)

    res.json(visibleJobs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch recruiter jobs" })
  }
}

export async function getMyRecruiterJobs(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const recruiter = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { companyId: true },
    })

    if (recruiter?.companyId) {
      await enforceCompanyJobVisibility(recruiter.companyId)
    }

  const jobs = await prisma.job.findMany({
  where: {
    postedById: req.user.id,
    isExternal: false,
  },
  select: {
  id: true,
  title: true,
  slug: true,
  location: true,
  employmentType: true,
  createdAt: true,
  views: true,
  isActive: true,
  _count: {
    select: {
      JobApplication: true,
    },
  },
},
  orderBy: {
    createdAt: "desc",
  },
});

res.json(jobs);
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch recruiter jobs" })
  }
}

export async function getJobById(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: Number(req.params.id),
        postedById: req.user.id,
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
}

export async function updateJob(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const job = await prisma.job.findFirst({
      where: {
        id: Number(req.params.id),
        postedById: req.user.id,
      },
      include: {
        Company: {
          select: {
            subscriptionPlan: true,
            subscriptionExpiresAt: true,
          },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const data = {
      // ===========================
      // Basic
      // ===========================
      title: req.body.title,
      slug: req.body.slug,
      description: req.body.description,
      responsibilities: req.body.responsibilities,
      requirements: req.body.requirements,
      aboutCompany: req.body.aboutCompany,

      // ===========================
      // Company
      // ===========================
      companyWebsite: req.body.companyWebsite,
      companySize: req.body.companySize,
      industry: req.body.industry,
      department: req.body.department,
      reportsTo: req.body.reportsTo,

      // ===========================
      // Employment
      // ===========================
      employmentType: req.body.employmentType,
      workplaceType: req.body.workplaceType,
      jobFunction: req.body.jobFunction,
      seniorityLevel: req.body.seniorityLevel,
      employmentMode: req.body.employmentMode,
      shift: req.body.shift,

      // ===========================
      // Experience
      // ===========================
      experience: req.body.experience,
      minExperience: req.body.minExperience
        ? Number(req.body.minExperience)
        : null,
      maxExperience: req.body.maxExperience
        ? Number(req.body.maxExperience)
        : null,
      education: req.body.education,
      noticePeriod: req.body.noticePeriod,

      // ===========================
      // Location
      // ===========================
      location: req.body.location,
      country: req.body.country,
      state: req.body.state,
      city: req.body.city,
      zipCode: req.body.zipCode,

      isRemote: req.body.isRemote ?? false,
      isHybrid: req.body.isHybrid ?? false,

      // ===========================
      // Salary
      // ===========================
      salaryMin: req.body.salaryMin
        ? Number(req.body.salaryMin)
        : null,

      salaryMax: req.body.salaryMax
        ? Number(req.body.salaryMax)
        : null,

      salaryCurrency: req.body.salaryCurrency || "INR",
      salaryPeriod: req.body.salaryPeriod,
      showSalary: req.body.showSalary ?? true,

      // ===========================
      // Hiring
      // ===========================
      openings: req.body.openings
        ? Number(req.body.openings)
        : 1,

      applicationDeadline: req.body.applicationDeadline
        ? new Date(req.body.applicationDeadline)
        : null,

      expectedJoiningDate: req.body.expectedJoiningDate
        ? new Date(req.body.expectedJoiningDate)
        : null,

      // ===========================
      // Skills
      // ===========================
      skills: req.body.skills ?? [],
      preferredSkills: req.body.preferredSkills ?? [],
      benefits: req.body.benefits ?? [],
      languages: req.body.languages ?? [],

      // ===========================
      // Recruiter
      // ===========================
      recruiterName: req.body.recruiterName,
      recruiterEmail: req.body.recruiterEmail,
      recruiterPhone: req.body.recruiterPhone,

      // ===========================
      // Apply
      // ===========================
      applyUrl: req.body.applyUrl,
      linkedinUrl: req.body.linkedinUrl,

      // ===========================
      // Extras
      // ===========================
      referralBonus: req.body.referralBonus
        ? Number(req.body.referralBonus)
        : null,

      travelRequired: req.body.travelRequired ?? false,
      relocationSupport: req.body.relocationSupport ?? false,
      visaSponsorship: req.body.visaSponsorship ?? false,

      // ===========================
      // Application Settings
      // ===========================
      requireResume: req.body.requireResume ?? true,
      requireCoverLetter: req.body.requireCoverLetter ?? false,
      requirePortfolio: req.body.requirePortfolio ?? false,
      requireLinkedin: req.body.requireLinkedin ?? false,
      allowEasyApply: req.body.allowEasyApply ?? true,

      // ===========================
      // SEO
      // ===========================
      metaTitle: req.body.metaTitle,
      metaDescription: req.body.metaDescription,
      keywords: req.body.keywords ?? [],
    };

    // ===========================
    // Featured Job Logic
    // ===========================
    if (typeof req.body.isFeatured === "boolean") {
      if (req.body.isFeatured) {
        const FEATURED_ELIGIBLE_PLANS = [
          "professional",
          "enterprise",
        ];

        const plan = (
          job.Company?.subscriptionPlan || "free"
        ).toLowerCase();

        const isEligiblePlan =
          FEATURED_ELIGIBLE_PLANS.includes(plan);

        const isPlanActive =
          !job.Company?.subscriptionExpiresAt ||
          new Date(job.Company.subscriptionExpiresAt) >
          new Date();

        if (!isEligiblePlan || !isPlanActive) {
          return res.status(403).json({
            error:
              "Featured jobs are only available on Professional and Enterprise plans",
            code: "PLAN_NOT_ELIGIBLE",
            currentPlan: plan,
          });
        }

        data.isFeatured = true;
        data.featuredAt = new Date();
      } else {
        data.isFeatured = false;
        data.featuredAt = null;
      }
    }

    const updatedJob = await prisma.job.update({
      where: {
        id: Number(req.params.id),
      },
      data,
    });

    res.json(updatedJob);
  } catch (err) {
    console.error("UPDATE JOB ERROR:", err);
    res.status(500).json({
      error: err.message || "Failed to update job",
    });
  }
}

/**
 * Recruiter: dashboard stats + recent jobs
 */
export async function getRecruiterDashboard(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const recruiterId = req.user.id
    const recruiter = await prisma.user.findUnique({
  where: {
    id: recruiterId,
  },
  include: {
    Company: {
      select: {
        name: true,
      },
    },
  },
})

    // 1️⃣ Jobs count
    const jobsCount = await prisma.job.count({
      where: {
        postedById: recruiterId,
        isActive: true,
      },
    })

// 2️⃣ Applications count
const applicationsCount = await prisma.jobApplication.count({
  where: {
    Job: {
      postedById: recruiterId,
    },
  },
})

// 3️⃣ Shortlisted count
const shortlistedCount = await prisma.jobApplication.count({
  where: {
    status: "shortlisted",
    Job: {
      postedById: recruiterId,
    },
  },
})

    // 4️⃣ Recent jobs (last 5)
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

   res.json({
  jobsCount,
  applicationsCount,
  shortlistedCount,
  recentJobs,

  recruiter: {
    companyName: recruiter?.Company?.name,
  },
})
  } catch (err) {
    console.error("Recruiter dashboard error:", err)
    res.status(500).json({ error: "Failed to load dashboard" })
  }
}

/**
 * Admin: deactivate job (soft delete)
 */
export async function deactivateJob(req, res) {
  try {
    const job = await prisma.job.update({
      where: { id: Number(req.params.id) },
      data: { isActive: false },
    });

    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ error: "Failed to deactivate job" });
  }
}

/**
 * Admin: company-wise jobs with count
 */
export const getAdminCompanyJobs = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        Job: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            title: true,
            location: true,
            employmentType: true,
            createdAt: true,
            views: true,
            _count: {
              select: {
                JobApplication: true,
              },
            },
          },
        },
      },
    })

    const formatted = companies.map(company => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      jobsCount: company.Job.length,
      jobs: company.Job.map(job => ({
        id: job.id,
        title: job.title,
        location: job.location,
        employmentType: job.employmentType,
        createdAt: job.createdAt,
        views: job.views,
        appliedCount: job._count.JobApplication,
      })),
    }))

    res.json(formatted)
  } catch (err) {
    console.error("Admin company jobs error:", err)
    res.status(500).json({
      error: err.message,
    })
  }
}

/**
 * 👁️ PUBLIC: Increment job view
 */
export async function incrementJobView(req, res) {
  try {
    const { slug } = req.params;

    console.log("Incrementing views for:", slug);

    const job = await prisma.job.update({
      where: { slug },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    console.log("New view count:", job.views);

    res.json(job);
  } catch (err) {
    console.error("Increment job view error:", err);
    res.status(500).json({
      error: "Failed to increment job view",
    });
  }
}