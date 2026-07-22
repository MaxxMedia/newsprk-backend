import { prisma } from "../lib/prisma.js";

/* GET Interests */
export async function getMyInterests(req, res) {
  try {
    const interests = await prisma.candidateInterest.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(interests);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch interests",
    });
  }
}

/* ADD Interest */
export async function addInterest(req, res) {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Interest name is required",
      });
    }

    const interest = await prisma.candidateInterest.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
      },
    });

    res.status(201).json(interest);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to add interest",
    });
  }
}

/* UPDATE Interest */
export async function updateInterest(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const existing = await prisma.candidateInterest.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Interest not found",
      });
    }

    const updated = await prisma.candidateInterest.update({
      where: {
        id: Number(id),
      },
      data: {
        name,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update interest",
    });
  }
}

/* DELETE Interest */
export async function deleteInterest(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateInterest.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Interest not found",
      });
    }

    await prisma.candidateInterest.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Interest deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete interest",
    });
  }
}