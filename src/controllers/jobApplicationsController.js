import { prisma } from "../lib/prisma.js"

/**
 * Candidate applies for job
 */
export async function applyJob(req, res) {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({ error: "Only candidates can apply" })
    }

    const job = await prisma.job.findUnique({
      where: { id: req.body.jobId },
      select: { id: true, isExternal: true, isActive: true },
    })

    if (!job) {
      return res.status(404).json({ error: "Job not found" })
    }

    if (!job.isActive) {
      return res.status(400).json({ error: "Job is not active" })
    }

    // 🔥 BLOCK EXTERNAL JOBS
    if (job.isExternal) {
      return res.status(400).json({
        error: "Please apply through the external website",
      })
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId: req.body.jobId,
        userId: req.user.id,
        resumeUrl: req.body.resumeUrl,
        coverNote: req.body.coverNote,
      },
    })

    res.json(application)
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Already applied for this job" })
    }
    console.error(err)
    res.status(500).json({ error: "Job application failed" })
  }
}

/**
 * Candidate: view own applications
 */
export async function getMyApplications(req, res) {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const applications = await prisma.jobApplication.findMany({
      where: {
        userId: req.user.id,          // ✅ FIX (MOST IMPORTANT)
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        Job: {
          include: { Company: true },
        },
      },
    })

    res.json(applications)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch applications" })
  }
}

/**
 * Recruiter: view applicants for a job
 */
export async function getApplicantsByJob(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const jobId = Number(req.params.jobId)

    // 🔒 Recruiter can see ONLY their jobs
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        postedById: req.user.id,      // ✅ FIX
      },
    })

    if (!job) {
      return res.status(404).json({ error: "Job not found" })
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      include: {
        User: {
          select: {
            id: true,
            fullName: true,
            email: true,
            headline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
  applications.map(app => ({
    ...app,
    job: {
      ...app.Job,
      company: app.Job?.Company,
    },
  }))
)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch applicants" })
  }
}

/**
 * Recruiter: update application status
 */
export async function updateApplicationStatus(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const { applicationId } = req.params
    const { status } = req.body

    if (!["shortlisted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" })
    }

    const application = await prisma.jobApplication.findUnique({
      where: { id: Number(applicationId) },
      include: {
        Job: true,
      },
    })

    if (!application || application.Job.postedById !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" })
    }

    const updated = await prisma.jobApplication.update({
      where: { id: Number(applicationId) },
      data: { status },
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to update status" })
  }
}


// export const getAdminCompanyJobs = async (req, res) => {
//   console.log("🔥 getAdminCompanyJobs HIT")

//   const companies = await prisma.company.findMany({
//     select: {
//       id: true,
//       name: true,
//       slug: true,
//       jobs: {
//         where: { isActive: true },
//         select: {
//           id: true,
//           title: true,
//           location: true,
//           employmentType: true,
//           createdAt: true,
//           views: true,
//           _count: {
//             select: { applications: true }, // ✅ THIS
//           },
//         },
//       },
//     },
//   })

//   const formatted = companies.map(company => ({
//     id: company.id,
//     name: company.name,
//     slug: company.slug,
//     jobsCount: company.jobs.length,
//     jobs: company.jobs.map(job => ({
//       id: job.id,
//       title: job.title,
//       location: job.location,
//       employmentType: job.employmentType,
//       createdAt: job.createdAt,
//       views: job.views,
//       appliedCount: job._count.applications, // ✅ FIX
//     })),
//   }))

//   res.json(formatted)
// }
