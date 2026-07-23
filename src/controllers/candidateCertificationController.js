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
      title,           // ✅ Use 'title' (matches schema)
      organization,
      credentialUrl,
      issueDate,
      expiryDate,
    } = req.body;

    // Validate required fields
    if (!title?.trim()) {
      return res.status(400).json({
        error: "Certification title is required",
      });
    }

    const certification = await prisma.candidateCertification.create({
      data: {
        userId: req.user.id,
        title: title.trim(),        // ✅ Use 'title'
        organization: organization || null,
        credentialUrl: credentialUrl || null,
        issueDate: issueDate ? new Date(issueDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    res.status(201).json(certification);
  } catch (err) {
    console.error("Error adding certification:", err);
    res.status(500).json({
      error: "Failed to add certification",
      details: err.message,
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
      title,
      organization,
      credentialUrl,
      issueDate,
      expiryDate,
    } = req.body;

    const updated = await prisma.candidateCertification.update({
      where: {
        id: Number(id),
      },
      data: {
        title: title?.trim() || existing.title,  // ✅ Use 'title'
        organization: organization !== undefined ? organization : existing.organization,
        credentialUrl: credentialUrl !== undefined ? credentialUrl : existing.credentialUrl,
        issueDate: issueDate ? new Date(issueDate) : existing.issueDate,
        expiryDate: expiryDate ? new Date(expiryDate) : existing.expiryDate,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating certification:", err);
    res.status(500).json({
      error: "Failed to update certification",
      details: err.message,
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
    console.error("Error deleting certification:", err);
    res.status(500).json({
      error: "Failed to delete certification",
      details: err.message,
    });
  }
}