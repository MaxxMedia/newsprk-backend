import { prisma } from "../lib/prisma.js";

/* GET Social Links */
export async function getMySocials(req, res) {
  try {
    const socials = await prisma.candidateSocial.findMany({
      where: {
        userId: req.user.id,
      },
    });

    res.json(socials);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch social links",
    });
  }
}

/* ADD Social Link */
export async function addSocial(req, res) {
  try {
    const { platform, url } = req.body;

    const social = await prisma.candidateSocial.create({
      data: {
        userId: req.user.id,
        platform,
        url,
      },
    });

    res.status(201).json(social);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to add social link",
    });
  }
}

/* UPDATE Social Link */
export async function updateSocial(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateSocial.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Social link not found",
      });
    }

    const updated = await prisma.candidateSocial.update({
      where: {
        id: Number(id),
      },
      data: req.body,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update social link",
    });
  }
}

/* DELETE Social Link */
export async function deleteSocial(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateSocial.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Social link not found",
      });
    }

    await prisma.candidateSocial.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Social link deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete social link",
    });
  }
}