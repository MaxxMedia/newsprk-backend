// controllers/teamController.js
import { prisma } from "../lib/prisma.js";
import { assertCanAddTeamMember, getTeamMemberEligibility } from "../lib/packageContentLimits.js";

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

    // ===== Team Profile package limit check =====
    // 1. Reads the company's subscriptionPlan (via assertCanAddTeamMember ->
    //    getTeamMemberEligibility -> getActiveSubscription, which resolves
    //    Company.subscriptionPlan).
    // 2. Determines the plan's team member limit
    //    (free: 0, basic: 5, professional: 10, enterprise: unlimited).
    // 3. Counts only ACTIVE CompanyTeamMember rows for this company
    //    (PENDING/REJECTED are excluded).
    // 4. If the limit has been reached, blocks the approval before any
    //    mutation happens and returns the required error shape.
    try {
      await assertCanAddTeamMember(request.companyId);
    } catch (limitError) {
      console.log(`⛔ Team member limit reached for company ${request.companyId}`);
      return res.status(limitError.status || 403).json({
        success: false,
        message: "Your team profile limit has been reached. Upgrade your subscription to add more members.",
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

export const addTeamMember = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { userId, designation, department, employmentType, startDate } = req.body;

    console.log(`📝 Adding team member by recruiter: ${recruiterId}`);

    // Validation
    if (!userId || !designation) {
      return res.status(400).json({
        success: false,
        message: "User ID and designation are required.",
      });
    }

    // Get recruiter's company
    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterId },
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

    if (recruiter.role !== "recruiter" && recruiter.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only recruiters and admins can add team members.",
      });
    }

    if (!recruiter.companyId) {
      return res.status(400).json({
        success: false,
        message: "You are not linked to any company. Please contact admin.",
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check if user is already a member (any status)
    const existing = await prisma.companyTeamMember.findFirst({
      where: {
        companyId: recruiter.companyId,
        userId: Number(userId),
      },
    });

    if (existing) {
      if (existing.status === "ACTIVE") {
        return res.status(409).json({
          success: false,
          message: "User is already an active team member.",
        });
      } else if (existing.status === "PENDING") {
        // If pending, auto-approve it
        const updated = await prisma.companyTeamMember.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            approvedById: recruiterId,
            approvedAt: new Date(),
            designation,
            department: department || existing.department,
            employmentType: employmentType || existing.employmentType,
            startDate: startDate ? new Date(startDate) : existing.startDate,
          },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
                username: true,
              },
            },
          },
        });

        // Update user's companyId if needed
        if (!targetUser.companyId) {
          await prisma.user.update({
            where: { id: Number(userId) },
            data: { companyId: recruiter.companyId },
          });
        }

        return res.status(200).json({
          success: true,
          message: "Pending request approved and member added successfully.",
          data: updated,
        });
      } else {
        return res.status(409).json({
          success: false,
          message: `User has a ${existing.status.toLowerCase()} status with this company.`,
        });
      }
    }

    // Check package limit before adding
    try {
      await assertCanAddTeamMember(recruiter.companyId);
    } catch (limitError) {
      console.log(`⛔ Team member limit reached for company ${recruiter.companyId}`);
      return res.status(limitError.status || 403).json({
        success: false,
        message: "Your team profile limit has been reached. Upgrade your subscription to add more members.",
      });
    }

    // Create ACTIVE team member directly
    const newMember = await prisma.companyTeamMember.create({
      data: {
        companyId: recruiter.companyId,
        userId: Number(userId),
        designation,
        department: department || null,
        employmentType: employmentType || null,
        startDate: startDate ? new Date(startDate) : null,
        status: "ACTIVE",
        approvedById: recruiterId,
        approvedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            username: true,
            headline: true,
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
    });

    // Update user's companyId if they don't have one
    if (!targetUser.companyId) {
      await prisma.user.update({
        where: { id: Number(userId) },
        data: { companyId: recruiter.companyId },
      });
    }

    console.log(`✅ Team member added successfully: ${targetUser.fullName}`);

    return res.status(201).json({
      success: true,
      message: "Team member added successfully.",
      data: newMember,
    });

  } catch (error) {
    console.error("❌ Error in addTeamMember:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

export const updateTeamMember = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const memberId = Number(req.params.id);
    const { designation, department, employmentType, startDate } = req.body;

    // Get recruiter's company
    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterId },
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

    if (recruiter.role !== "recruiter" && recruiter.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    // Find the team member
    const teamMember = await prisma.companyTeamMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    // Check if recruiter has permission
    if (recruiter.role !== "admin" && teamMember.companyId !== recruiter.companyId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this member.",
      });
    }

    // Build update data - REMOVED the TypeScript type annotation
    const updateData = {};
    if (designation) updateData.designation = designation;
    if (department !== undefined) updateData.department = department;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (startDate) updateData.startDate = new Date(startDate);

    // Only allow updates for ACTIVE members
    if (teamMember.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: `Cannot update ${teamMember.status.toLowerCase()} team members.`,
      });
    }

    const updated = await prisma.companyTeamMember.update({
      where: { id: memberId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            username: true,
            headline: true,
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
    });

    return res.status(200).json({
      success: true,
      message: "Team member updated successfully.",
      data: updated,
    });

  } catch (error) {
    console.error("❌ Error in updateTeamMember:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

export const removeTeamMember = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const memberId = Number(req.params.id);

    // Get recruiter's company
    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterId },
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

    if (recruiter.role !== "recruiter" && recruiter.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    // Find the team member
    const teamMember = await prisma.companyTeamMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    // Check if recruiter has permission
    if (recruiter.role !== "admin" && teamMember.companyId !== recruiter.companyId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to remove this member.",
      });
    }

    // Don't allow removing yourself
    if (teamMember.userId === recruiterId) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself from the team.",
      });
    }

    // Only allow removing ACTIVE members
    if (teamMember.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Only active members can be removed.",
      });
    }

    // Mark as FORMER (soft delete)
    const updated = await prisma.companyTeamMember.update({
      where: { id: memberId },
      data: {
        status: "FORMER",
        endDate: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            username: true,
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
    });

    // Optionally remove companyId from user if they have no other active memberships
    const otherMemberships = await prisma.companyTeamMember.findFirst({
      where: {
        userId: teamMember.userId,
        status: "ACTIVE",
        companyId: {
          not: teamMember.companyId,
        },
      },
    });

    // If no other active memberships, remove companyId
    if (!otherMemberships) {
      await prisma.user.update({
        where: { id: teamMember.userId },
        data: { companyId: null },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Team member removed successfully.",
      data: updated,
    });

  } catch (error) {
    console.error("❌ Error in removeTeamMember:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

export const searchCandidates = async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    const recruiterId = req.user.id;

    // Get recruiter's company
    const recruiter = await prisma.user.findUnique({
      where: { id: recruiterId },
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

    if (recruiter.role !== "recruiter" && recruiter.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    // Build search conditions - REMOVED the TypeScript type annotation
    const whereClause = {
      role: "candidate", // Only search candidates
    };

    if (q && q.trim().length > 0) {
      const searchTerm = q.trim();
      whereClause.OR = [
        { fullName: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { username: { contains: searchTerm } },
        { headline: { contains: searchTerm } },
      ];
    }

    // Exclude users already in the company (any status)
    if (recruiter.companyId) {
      const existingMembers = await prisma.companyTeamMember.findMany({
        where: {
          companyId: recruiter.companyId,
        },
        select: {
          userId: true,
        },
      });

      const excludedUserIds = existingMembers.map(m => m.userId);
      if (excludedUserIds.length > 0) {
        whereClause.NOT = {
          id: { in: excludedUserIds },
        };
      }
    }

    // Get candidates
    const candidates = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        email: true,
        username: true,
        avatarUrl: true,
        headline: true,
        about: true,
        location: true,
        createdAt: true,
      },
      orderBy: {
        fullName: 'asc',
      },
      take: Number(limit),
      skip: Number(offset),
    });

    // Get total count for pagination
    const total = await prisma.user.count({
      where: whereClause,
    });

    return res.status(200).json({
      success: true,
      data: candidates,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + candidates.length < total,
      },
    });

  } catch (error) {
    console.error("❌ Error in searchCandidates:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

export const getTeamMemberDetails = async (req, res) => {
  try {
    const memberId = Number(req.params.id);
    const userId = req.user.id;

    const member = await prisma.companyTeamMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true,
            avatarUrl: true,
            headline: true,
            about: true,
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
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Team member not found.",
      });
    }

    // Check if user has permission to view this member
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (user?.role !== "admin" && user?.companyId !== member.companyId) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    return res.status(200).json({
      success: true,
      data: member,
    });

  } catch (error) {
    console.error("❌ Error in getTeamMemberDetails:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
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

      // Admin "all companies" view has no single company scope,
      // so there's no single limit to report — keep this null and
      // don't affect existing admin behavior.
      return res.json({
        success: true,
        total: allMembers.length,
        data: allMembers,
        eligibility: null,
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

    // NEW: Team Profile package eligibility for this company, so the
    // frontend can display "Current Team Members: X / Y" (or "Unlimited")
    // and disable the Approve action once the limit is reached — without
    // needing a separate API call. Purely additive field; does not change
    // any existing response shape or behavior.
    const eligibility = await getTeamMemberEligibility(recruiter.companyId);

    return res.json({
      success: true,
      total: members.length,
      data: members,
      eligibility,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};