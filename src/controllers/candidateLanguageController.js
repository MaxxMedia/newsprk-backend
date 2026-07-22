import { prisma } from "../lib/prisma.js";

/* GET Languages */
export async function getMyLanguages(req, res) {
  try {
    const languages = await prisma.candidateLanguage.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(languages);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch languages",
    });
  }
}

/* ADD Language */
export async function addLanguage(req, res) {
  try {
    const { language, proficiency } = req.body;

    const newLanguage = await prisma.candidateLanguage.create({
      data: {
        userId: req.user.id,
        language,
        proficiency,
      },
    });

    res.status(201).json(newLanguage);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to add language",
    });
  }
}

/* UPDATE Language */
export async function updateLanguage(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateLanguage.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Language not found",
      });
    }

    const { language, proficiency } = req.body;

    const updated = await prisma.candidateLanguage.update({
      where: {
        id: Number(id),
      },
      data: {
        language,
        proficiency,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update language",
    });
  }
}

/* DELETE Language */
export async function deleteLanguage(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateLanguage.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Language not found",
      });
    }

    await prisma.candidateLanguage.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Language deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete language",
    });
  }
}