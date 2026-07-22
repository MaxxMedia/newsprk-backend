import { prisma } from "../lib/prisma.js";

/* GET My Experience */
export async function getMyExperience(req, res) {
  try {
    const experiences = await prisma.candidateExperience.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        company: true,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    res.json(experiences);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch experience" });
  }
}

/* ADD Experience */
export async function addExperience(req, res) {
  try {
    const {
      companyId,
      companyName,
      designation,
      employmentType,
      location,
      startDate,
      endDate,
      currentlyWorking,
      description,
    } = req.body;

    const experience = await prisma.candidateExperience.create({
      data: {
        userId: req.user.id,
        companyId: companyId || null,
        companyName,
        designation,
        employmentType,
        location,
        startDate: new Date(startDate),
        endDate:
          currentlyWorking || !endDate
            ? null
            : new Date(endDate),
        currentlyWorking: currentlyWorking || false,
        description,
      },
    });

    res.status(201).json(experience);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add experience" });
  }
}

/* UPDATE Experience */
export async function updateExperience(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateExperience.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Experience not found",
      });
    }

    const {
      companyId,
      companyName,
      designation,
      employmentType,
      location,
      startDate,
      endDate,
      currentlyWorking,
      description,
    } = req.body;

    const updated = await prisma.candidateExperience.update({
      where: {
        id: Number(id),
      },
      data: {
        companyId: companyId || null,
        companyName,
        designation,
        employmentType,
        location,
        startDate: new Date(startDate),
        endDate:
          currentlyWorking || !endDate
            ? null
            : new Date(endDate),
        currentlyWorking,
        description,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update experience",
    });
  }
}

/* DELETE Experience */
export async function deleteExperience(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateExperience.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Experience not found",
      });
    }

    await prisma.candidateExperience.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Experience deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete experience",
    });
  }
}