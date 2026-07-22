import { prisma } from "../lib/prisma.js";

/* GET Education */
export async function getMyEducation(req, res) {
  try {
    const education = await prisma.candidateEducation.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        endYear: "desc",
      },
    });

    res.json(education);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch education",
    });
  }
}

/* ADD Education */
export async function addEducation(req, res) {
  try {
    const {
      institution,
      degree,
      fieldOfStudy,
      startYear,
      endYear,
      grade,
      description,
    } = req.body;

    const education = await prisma.candidateEducation.create({
      data: {
        userId: req.user.id,
        institution,
        degree,
        fieldOfStudy,
        startYear,
        endYear,
        grade,
        description,
      },
    });

    res.status(201).json(education);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to add education",
    });
  }
}

/* UPDATE Education */
export async function updateEducation(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateEducation.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Education not found",
      });
    }

    const updated = await prisma.candidateEducation.update({
      where: {
        id: Number(id),
      },
      data: req.body,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update education",
    });
  }
}

/* DELETE Education */
export async function deleteEducation(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateEducation.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Education not found",
      });
    }

    await prisma.candidateEducation.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Education deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete education",
    });
  }
}