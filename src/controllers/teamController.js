import { prisma } from "../lib/prisma.js";

export const requestToJoinCompany = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      companyId,
      designation,
      department,
      employmentType,
      startDate,
    } = req.body;

    // Validation
    if (!companyId || !designation) {
      return res.status(400).json({
        success: false,
        message: "Company and designation are required.",
      });
    }

    // Check company exists
    const company = await prisma.company.findUnique({
      where: {
        id: Number(companyId),
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    // Already requested?
    const existing = await prisma.companyTeamMember.findFirst({
      where: {
        companyId: Number(companyId),
        userId,
        status: {
          in: ["PENDING", "ACTIVE"],
        },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending or active membership.",
      });
    }

    const membership = await prisma.companyTeamMember.create({
      data: {
        companyId: Number(companyId),
        userId,

        designation,
        department,
        employmentType,

        startDate: startDate
          ? new Date(startDate)
          : null,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Request sent successfully.",
      data: membership,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getMyTeamMembership = async (req, res) => {
  try {
    const userId = req.user.id;

    const membership = await prisma.companyTeamMember.findFirst({
      where: {
        userId,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isVerified: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!membership) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      data: membership,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getPendingRequests = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    // Find recruiter's company
    const recruiter = await prisma.user.findUnique({
      where: {
        id: recruiterId,
      },
      select: {
        companyId: true,
        role: true,
      },
    });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (recruiter.role !== "recruiter" && recruiter.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    if (!recruiter.companyId) {
      return res.status(400).json({
        success: false,
        message: "Recruiter is not linked to any company.",
      });
    }

    const requests = await prisma.companyTeamMember.findMany({
      where: {
        companyId: recruiter.companyId,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
            headline: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      total: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const approveTeamMember = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const teamMemberId = Number(req.params.id);

    // Find recruiter
    const recruiter = await prisma.user.findUnique({
      where: {
        id: recruiterId,
      },
      select: {
        role: true,
        companyId: true,
      },
    });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found.",
      });
    }

    if (
      recruiter.role !== "recruiter" &&
      recruiter.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    // Find request
    const request = await prisma.companyTeamMember.findUnique({
      where: {
        id: teamMemberId,
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found.",
      });
    }

    // Ensure recruiter belongs to same company
    if (request.companyId !== recruiter.companyId) {
      return res.status(403).json({
        success: false,
        message: "You cannot approve this request.",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Request has already been processed.",
      });
    }

    const updated = await prisma.companyTeamMember.update({
      where: {
        id: teamMemberId,
      },
      data: {
        status: "ACTIVE",
        approvedById: recruiterId,
        approvedAt: new Date(),
      },
      include: {
        company: true,
        user: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Employee approved successfully.",
      data: updated,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const rejectTeamMember = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const teamMemberId = Number(req.params.id);

    const { rejectionReason } = req.body;

    const recruiter = await prisma.user.findUnique({
      where: {
        id: recruiterId,
      },
      select: {
        role: true,
        companyId: true,
      },
    });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found.",
      });
    }

    if (
      recruiter.role !== "recruiter" &&
      recruiter.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const request = await prisma.companyTeamMember.findUnique({
      where: {
        id: teamMemberId,
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found.",
      });
    }

    if (request.companyId !== recruiter.companyId) {
      return res.status(403).json({
        success: false,
        message: "You cannot reject this request.",
      });
    }

    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Request has already been processed.",
      });
    }

    const updated = await prisma.companyTeamMember.update({
      where: {
        id: teamMemberId,
      },
      data: {
        status: "REJECTED",
        rejectionReason: rejectionReason ?? null,
        approvedById: recruiterId,
        approvedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Request rejected successfully.",
      data: updated,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const getCompanyTeamMembers = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    const recruiter = await prisma.user.findUnique({
      where: {
        id: recruiterId,
      },
      select: {
        companyId: true,
        role: true,
      },
    });

    if (!recruiter) {
      return res.status(404).json({
        success: false,
        message: "Recruiter not found.",
      });
    }

    if (
      recruiter.role !== "recruiter" &&
      recruiter.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const members = await prisma.companyTeamMember.findMany({
      where: {
        companyId: recruiter.companyId,
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            avatarUrl: true,
            headline: true,
            location: true,
          },
        },
      },
      orderBy: {
        approvedAt: "asc",
      },
    });

    return res.json({
      success: true,
      total: members.length,
      data: members,
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};