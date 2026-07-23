import { prisma } from "../lib/prisma.js";

/* GET My Skills */
export async function getMySkills(req, res) {
  try {
    const skills = await prisma.candidateSkill.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(skills);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch skills" });
  }
}

/* ADD Skill */
export async function addSkill(req, res) {
  try {
    const { name, level } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Skill name is required",
      });
    }

    const skill = await prisma.candidateSkill.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        level,
      },
    });

    res.status(201).json(skill);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to add skill",
    });
  }
}

/* UPDATE Skill */
export async function updateSkill(req, res) {
  try {
    const { id } = req.params;
    const { name, level } = req.body;

    const skill = await prisma.candidateSkill.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!skill || skill.userId !== req.user.id) {
      return res.status(404).json({
        error: "Skill not found",
      });
    }

    const updated = await prisma.candidateSkill.update({
      where: {
        id: Number(id),
      },
      data: {
        name,
        level,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update skill",
    });
  }
}

/* DELETE Skill */
export async function deleteSkill(req, res) {
  try {
    const { id } = req.params;

    const skill = await prisma.candidateSkill.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!skill || skill.userId !== req.user.id) {
      return res.status(404).json({
        error: "Skill not found",
      });
    }

    await prisma.candidateSkill.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Skill deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete skill",
    });
  }
}