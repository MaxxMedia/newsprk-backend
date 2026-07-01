import { prisma } from "../lib/prisma.js";

function requireCandidate(req, res) {
  if (req.user.role !== "candidate") {
    res.status(403).json({ error: "Only candidates can manage job alerts" });
    return false;
  }
  return true;
}

function buildJobWhereFromAlert(alert) {
  const where = { isActive: true };
  const and = [];

  if (alert.keywords?.trim()) {
    const terms = alert.keywords.trim().split(/\s+/);
    and.push({
      OR: terms.flatMap((term) => [
        { title: { contains: term } },
        { description: { contains: term } },
      ]),
    });
  }

  if (alert.location?.trim()) {
    and.push({ location: { contains: alert.location.trim() } });
  }

  if (alert.employmentType?.trim()) {
    and.push({ employmentType: alert.employmentType.trim() });
  }

  if (alert.isRemote === true) {
    and.push({ isRemote: true });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

export async function getMyJobAlerts(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const alerts = await prisma.jobAlert.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    const alertsWithCounts = await Promise.all(
      alerts.map(async (alert) => {
        const matchCount = await prisma.job.count({
          where: buildJobWhereFromAlert(alert),
        });
        return { ...alert, matchCount };
      })
    );

    res.json(alertsWithCounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch job alerts" });
  }
}

export async function createJobAlert(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const { name, keywords, location, employmentType, isRemote } = req.body;

    if (!keywords?.trim() && !location?.trim() && !employmentType?.trim()) {
      return res.status(400).json({
        error: "Provide at least one of keywords, location, or employment type",
      });
    }

    const alert = await prisma.jobAlert.create({
      data: {
        userId: req.user.id,
        name: name?.trim() || null,
        keywords: keywords?.trim() || null,
        location: location?.trim() || null,
        employmentType: employmentType?.trim() || null,
        isRemote: isRemote === true ? true : isRemote === false ? false : null,
      },
    });

    res.status(201).json(alert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create job alert" });
  }
}

export async function updateJobAlert(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const alertId = Number(req.params.id);
    const existing = await prisma.jobAlert.findFirst({
      where: { id: alertId, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Job alert not found" });
    }

    const { name, keywords, location, employmentType, isRemote, isActive } =
      req.body;

    const alert = await prisma.jobAlert.update({
      where: { id: alertId },
      data: {
        ...(name !== undefined && { name: name?.trim() || null }),
        ...(keywords !== undefined && { keywords: keywords?.trim() || null }),
        ...(location !== undefined && { location: location?.trim() || null }),
        ...(employmentType !== undefined && {
          employmentType: employmentType?.trim() || null,
        }),
        ...(isRemote !== undefined && {
          isRemote: isRemote === true ? true : isRemote === false ? false : null,
        }),
        ...(isActive !== undefined && { isActive: !!isActive }),
      },
    });

    res.json(alert);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update job alert" });
  }
}

export async function deleteJobAlert(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const alertId = Number(req.params.id);
    const existing = await prisma.jobAlert.findFirst({
      where: { id: alertId, userId: req.user.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Job alert not found" });
    }

    await prisma.jobAlert.delete({ where: { id: alertId } });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete job alert" });
  }
}

export async function getAlertMatches(req, res) {
  try {
    if (!requireCandidate(req, res)) return;

    const alertId = Number(req.params.id);
    const alert = await prisma.jobAlert.findFirst({
      where: { id: alertId, userId: req.user.id },
    });

    if (!alert) {
      return res.status(404).json({ error: "Job alert not found" });
    }

    const jobs = await prisma.job.findMany({
      where: buildJobWhereFromAlert(alert),
      orderBy: { createdAt: "desc" },
      include: { Company: true },
      take: 20,
    });

    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch matching jobs" });
  }
}
