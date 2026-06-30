import { prisma } from "../lib/prisma.js";
import { uploadResumeToCloudinary } from "./uploadController.js";


/**
 * Candidate applies for job
 */
export async function applyJob(req, res) {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        error: "Only candidates can apply",
      });
    }

    const job = await prisma.job.findUnique({
      where: {
        id: Number(req.body.jobId),
      },
      select: {
        id: true,
        isExternal: true,
        isActive: true,
      },
    });

    if (!job) {
      return res.status(404).json({
        error: "Job not found",
      });
    }

    if (!job.isActive) {
      return res.status(400).json({
        error: "Job is not active",
      });
    }

    if (job.isExternal) {
      return res.status(400).json({
        error: "Please apply through the external website",
      });
    }

    let resumeUrl = null;

   if (req.file) {
  const uploaded = await uploadResumeToCloudinary(req.file);
  resumeUrl = uploaded.secure_url;
}

console.log("Resume URL:", resumeUrl);


    const application = await prisma.jobApplication.create({
      data: {
        jobId: Number(req.body.jobId),
        userId: req.user.id,
        resumeUrl,
        coverNote: req.body.coverNote,
      },
    });

    res.json(application);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(400).json({
        error: "Already applied for this job",
      });
    }

    console.error(err);

    res.status(500).json({
      error: "Job application failed",
    });
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
        userId: req.user.id,
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
        postedById: req.user.id,
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
        Job: {
          include: {
            Company: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ✅ FIX: Explicitly return resumeUrl and clean structure
    res.json(
      applications.map(app => ({
        id: app.id,
        jobId: app.jobId,
        userId: app.userId,
        resumeUrl: app.resumeUrl,  // ✅ CRITICAL - ADD THIS
        coverNote: app.coverNote,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        User: {
          id: app.User.id,
          fullName: app.User.fullName,
          email: app.User.email,
          headline: app.User.headline,
        },
        Job: app.Job ? {
          id: app.Job.id,
          title: app.Job.title,
          location: app.Job.location,
          employmentType: app.Job.employmentType,
          Company: app.Job.Company ? {
            id: app.Job.Company.id,
            name: app.Job.Company.name,
          } : null,
        } : null,
      }))
    )
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch applicants" })
  }
}

export async function getApplicationById(req, res) {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({
        error: "Not allowed",
      });
    }

    const applicationId = Number(req.params.applicationId);

    const application = await prisma.jobApplication.findUnique({
      where: {
        id: applicationId,
      },
      include: {
        User: {
          select: {
            id: true,
            fullName: true,
            email: true,
            headline: true,
          },
        },
        Job: {
          include: {
            Company: true,
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({
        error: "Application not found",
      });
    }

    // Recruiter can view only applications for their own jobs
    if (application.Job.postedById !== req.user.id) {
      return res.status(403).json({
        error: "Not authorized",
      });
    }

    res.json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch application",
    });
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