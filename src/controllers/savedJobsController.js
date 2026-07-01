import { prisma } from "../lib/prisma.js";

function requireCandidate(req, res) {
  if (req.user.role !== "candidate") {
    res.status(403).json({ error: "Only candidates can save jobs" });
    return false;
  }
  return true;
}

export async function getMySavedJobs(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const saved = await prisma.savedJob.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        Job: {
          include: { Company: true },
        },
      },
    });

    res.json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch saved jobs" });
  }
}

export async function saveJob(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const jobId = Number(req.params.jobId);
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    await prisma.savedJob.create({
      data: {
        jobId,
        userId: req.user.id,
      },
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Job already saved" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to save job" });
  }
}

export async function unsaveJob(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const jobId = Number(req.params.jobId);

    await prisma.savedJob.delete({
      where: {
        jobId_userId: {
          jobId,
          userId: req.user.id,
        },
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unsave job" });
  }
}

export async function getSaveStatus(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const jobId = Number(req.params.jobId);

    const saved = await prisma.savedJob.findUnique({
      where: {
        jobId_userId: {
          jobId,
          userId: req.user.id,
        },
      },
    });

    res.json({ isSaved: !!saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check save status" });
  }
}
