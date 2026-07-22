import { prisma } from "../lib/prisma.js";

/* GET Achievements */
export async function getMyAchievements(req, res) {
  try {
    const achievements = await prisma.candidateAchievement.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        achievementDate: "desc",
      },
    });

    res.json(achievements);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch achievements",
    });
  }
}

/* ADD Achievement */
export async function addAchievement(req, res) {
  try {
    const {
      title,
      organization,
      description,
      achievementDate,
      certificateUrl,
    } = req.body;

    const achievement = await prisma.candidateAchievement.create({
      data: {
        userId: req.user.id,
        title,
        organization,
        description,
        certificateUrl,
        achievementDate: achievementDate
          ? new Date(achievementDate)
          : null,
      },
    });

    res.status(201).json(achievement);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to add achievement",
    });
  }
}

/* UPDATE Achievement */
export async function updateAchievement(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateAchievement.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Achievement not found",
      });
    }

    const {
      title,
      organization,
      description,
      achievementDate,
      certificateUrl,
    } = req.body;

    const updated = await prisma.candidateAchievement.update({
      where: {
        id: Number(id),
      },
      data: {
        title,
        organization,
        description,
        certificateUrl,
        achievementDate: achievementDate
          ? new Date(achievementDate)
          : null,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update achievement",
    });
  }
}

/* DELETE Achievement */
export async function deleteAchievement(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateAchievement.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Achievement not found",
      });
    }

    await prisma.candidateAchievement.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Achievement deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete achievement",
    });
  }
}