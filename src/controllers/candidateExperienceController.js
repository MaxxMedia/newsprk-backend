import { prisma } from "../lib/prisma.js";

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

export async function addExperience(req, res) {
  try {
    const {
      companyId,
      companyName,
      designation,  // ✅ Use 'designation' not 'title'
      employmentType,
      location,
      startDate,
      endDate,
      currentlyWorking,
      description,
    } = req.body;

    // Validate
    if (!designation?.trim()) {
      return res.status(400).json({
        error: "Job designation is required",
      });
    }

    if (!companyName?.trim() && !companyId) {
      return res.status(400).json({
        error: "Company name or ID is required",
      });
    }

    const experience = await prisma.candidateExperience.create({
      data: {
        userId: req.user.id,
        companyId: companyId || null,
        companyName: companyName?.trim() || "",
        designation: designation.trim(),
        employmentType: employmentType || null,
        location: location || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: currentlyWorking || !endDate ? null : new Date(endDate),
        currentlyWorking: currentlyWorking || false,
        description: description || null,
      },
      include: {
        company: true,
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