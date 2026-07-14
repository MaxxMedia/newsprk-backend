// controllers/teamController.js
import { prisma } from "../lib/prisma.js";

export const requestToJoinCompany = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📝 New team request from user: ${userId}`);

    const {
      companyId,
      designation,
      department,
      employmentType,
      startDate,
    } = req.body;

    console.log(`📋 Request data:`, { companyId, designation, department, employmentType, startDate });

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
      console.log(`❌ Company not found: ${companyId}`);
      return res.status(404).json({
        success: false,
        message: "Company not found.",
      });
    }

    console.log(`✅ Company found: ${company.name} (ID: ${company.id})`);

    // Check if user already has a pending or active request
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
      console.log(`⚠️ User already has ${existing.status} request for this company`);
      return res.status(409).json({
        success: false,
        message: `You already have a ${existing.status.toLowerCase()} membership for this company.`,
      });
    }

    // Create the membership request
    const membership = await prisma.companyTeamMember.create({
      data: {
        companyId: Number(companyId),
        userId,
        designation,
        department,
        employmentType,
        startDate: startDate ? new Date(startDate) : null,
        status: "PENDING",
      },
    });

    console.log(`✅ Team request created successfully:`, {
      id: membership.id,
      userId: membership.userId,
      companyId: membership.companyId,
      status: membership.status
    });

    return res.status(201).json({
      success: true,
      message: "Request sent successfully.",
      data: membership,
    });
  } catch (error) {
    console.error("❌ Error in requestToJoinCompany:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

export const getMyTeamMembership = async (req, res) => {
  try {
    const userId = req.user.id;
    const { companyId } = req.query;

    // If companyId is provided, check for that specific company
    const whereClause = companyId
      ? { userId, companyId: Number(companyId) }
      : { userId };

    const membership = await prisma.companyTeamMember.findFirst({
      where: whereClause,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isVerified: true,
            tagline: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        message: "No team membership found",
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

    console.log(`🔍 Fetching pending requests for recruiter: ${recruiterId}`);

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
      console.log('❌ Recruiter not found');
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    console.log(`📋 Recruiter role: ${recruiter.role}, companyId: ${recruiter.companyId}`);

    // If admin, return all pending requests
    if (recruiter.role === "admin") {
      console.log('👑 Admin: Fetching all pending requests');
      const allRequests = await prisma.companyTeamMember.findMany({
        where: {
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
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      console.log(`✅ Found ${allRequests.length} total pending requests`);
      return res.status(200).json({
        success: true,
        total: allRequests.length,
        data: allRequests,
      });
    }

    // For recruiters
    if (recruiter.role !== "recruiter") {
      console.log(`❌ User is not a recruiter: ${recruiter.role}`);
      return res.status(403).json({
        success: false,
        message: "Access denied. Only recruiters and admins can view pending requests.",
      });
    }

    if (!recruiter.companyId) {
      console.log('❌ Recruiter has no companyId');
      return res.status(200).json({
        success: true,
        total: 0,
        data: [],
        message: "You are not linked to any company. Please contact admin.",
      });
    }

    // Get pending requests for this specific company
    console.log(`🔍 Fetching pending requests for company: ${recruiter.companyId}`);

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
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`✅ Found ${requests.length} pending requests for company ${recruiter.companyId}`);

    return res.status(200).json({
      success: true,
      total: requests.length,
      data: requests,
    });

  } catch (error) {
    console.error("❌ Error in getPendingRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
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

    // Ensure recruiter belongs to same company (or is admin)
    if (recruiter.role !== "admin" && request.companyId !== recruiter.companyId) {
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

    // Also update the user's companyId if they don't have one
    if (updated.user && !updated.user.companyId) {
      await prisma.user.update({
        where: { id: updated.userId },
        data: { companyId: updated.companyId },
      });
    }

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

    if (recruiter.role !== "admin" && request.companyId !== recruiter.companyId) {
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

    // If admin, can view all members
    if (recruiter.role === "admin" && !req.query.companyId) {
      const allMembers = await prisma.companyTeamMember.findMany({
        where: {
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
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
        orderBy: {
          approvedAt: "asc",
        },
      });

      return res.json({
        success: true,
        total: allMembers.length,
        data: allMembers,
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
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            fullName: true,
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