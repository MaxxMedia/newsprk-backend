import { prisma } from "../lib/prisma.js";

/* GET Projects */
export async function getMyProjects(req, res) {
  try {
    const projects = await prisma.candidateProject.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch projects",
    });
  }
}

/* ADD Project */
export async function addProject(req, res) {
  try {
    const {
      title,
      role,
      description,
      imageUrl,
      websiteUrl,
      githubUrl,
      technologies,
      startDate,
      endDate,
    } = req.body;

    const project = await prisma.candidateProject.create({
      data: {
        userId: req.user.id,
        title,
        role,
        description,
        imageUrl,
        websiteUrl,
        githubUrl,
        technologies,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to add project",
    });
  }
}

/* UPDATE Project */
export async function updateProject(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateProject.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    const {
      title,
      role,
      description,
      imageUrl,
      websiteUrl,
      githubUrl,
      technologies,
      startDate,
      endDate,
    } = req.body;

    const updated = await prisma.candidateProject.update({
      where: {
        id: Number(id),
      },
      data: {
        title,
        role,
        description,
        imageUrl,
        websiteUrl,
        githubUrl,
        technologies,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update project",
    });
  }
}

/* DELETE Project */
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateProject.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Project not found",
      });
    }

    await prisma.candidateProject.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete project",
    });
  }
}