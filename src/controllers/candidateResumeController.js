import prisma from "../prismaClient.js";

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required.",
      });
    }

    const existingResume = await prisma.candidateResume.findUnique({
      where: {
        userId: req.user.id,
      },
    });

    let resume;

    if (existingResume) {
      resume = await prisma.candidateResume.update({
        where: {
          userId: req.user.id,
        },
        data: {
          fileName: req.file.originalname,
          fileUrl: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
      });
    } else {
      resume = await prisma.candidateResume.create({
        data: {
          userId: req.user.id,
          fileName: req.file.originalname,
          fileUrl: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
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