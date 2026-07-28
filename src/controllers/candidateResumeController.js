import prisma from "../prismaClient.js";
// ✅ ADDED: this was the missing piece — uploadController.js already had
// uploadResumeToCloudinary() defined, it was just never imported/called
// here. Without it, req.file.path (multer memoryStorage has no .path)
// was being saved straight into fileUrl, so resumes never actually made
// it to Cloudinary and fileUrl was always null/undefined in the DB.
import { uploadResumeToCloudinary } from "./uploadController.js";

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required.",
      });
    }

    // ✅ ADDED: actually push the in-memory buffer to Cloudinary and get
    // back a real, permanent, public URL (secure_url).
    let uploadResult;
    try {
      uploadResult = await uploadResumeToCloudinary(req.file);
    } catch (uploadErr) {
      console.error("Cloudinary resume upload failed:", uploadErr);
      return res.status(500).json({
        success: false,
        message: "Failed to upload resume file to storage.",
      });
    }

    const existingResume = await prisma.candidateResume.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    // ✅ CHANGED: fileUrl now comes from Cloudinary's secure_url,
    // not req.file.path (which never existed with memoryStorage).
    const payload = {
      fileName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    };

    let resume;

    if (existingResume) {
      resume = await prisma.candidateResume.update({
        where: {
          userId: req.user.id,
        },
        data: payload,
      });
    } else {
      resume = await prisma.candidateResume.create({
        data: {
          userId: req.user.id,
          ...payload,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume uploaded successfully.",
      data: resume,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to upload resume.",
    });
  }
};

export const getMyResume = async (req, res) => {
  try {
    const resume = await prisma.candidateResume.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    return res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch resume.",
    });
  }
};

export const deleteResume = async (req, res) => {
  try {
    const resume = await prisma.candidateResume.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    await prisma.candidateResume.delete({
      where: {
        userId: req.user.id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Resume deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete resume.",
    });
  }
};

export const getCandidateResume = async (req, res) => {
  try {
    const resume = await prisma.candidateResume.findUnique({
      where: {
        userId: Number(req.params.userId),
      },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch resume.",
    });
  }
};