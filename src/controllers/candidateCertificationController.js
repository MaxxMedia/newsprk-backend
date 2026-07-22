import { prisma } from "../lib/prisma.js";

/* GET Certifications */
export async function getMyCertifications(req, res) {
  try {
    const certifications = await prisma.candidateCertification.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        issueDate: "desc",
      },
    });

    res.json(certifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch certifications",
    });
  }
}

/* ADD Certification */
export async function addCertification(req, res) {
  try {
    const {
      name,
      organization,
      credentialId,
      credentialUrl,
      issueDate,
      expiryDate,
    } = req.body;

    const certification = await prisma.candidateCertification.create({
      data: {
        userId: req.user.id,
        name,
        organization,
        credentialId,
        credentialUrl,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    res.status(201).json(certification);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to add certification",
    });
  }
}

/* UPDATE Certification */
export async function updateCertification(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateCertification.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Certification not found",
      });
    }

    const {
      name,
      organization,
      credentialId,
      credentialUrl,
      issueDate,
      expiryDate,
    } = req.body;

    const updated = await prisma.candidateCertification.update({
      where: {
        id: Number(id),
      },
      data: {
        name,
        organization,
        credentialId,
        credentialUrl,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update certification",
    });
  }
}

/* DELETE Certification */
export async function deleteCertification(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.candidateCertification.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!existing || existing.userId !== req.user.id) {
      return res.status(404).json({
        error: "Certification not found",
      });
    }

    await prisma.candidateCertification.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({
      message: "Certification deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete certification",
    });
  }
}