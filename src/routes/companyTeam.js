// routes/companyTeam.js
import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// GET /api/companies/:slug/team - Public route to get company team members
router.get("/:slug/team", async (req, res) => {
    try {
        const { slug } = req.params;

        // Find company by slug
        const company = await prisma.company.findUnique({
            where: { slug },
            select: { id: true, name: true, slug: true, logoUrl: true },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }

        // Get all ACTIVE team members
        const members = await prisma.companyTeamMember.findMany({
            where: {
                companyId: company.id,
                status: "ACTIVE",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        avatarUrl: true,
                        headline: true,
                        location: true,
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

        // Add company info to each member
        const membersWithCompany = members.map(member => ({
            ...member,
            company: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                logoUrl: company.logoUrl,
            },
        }));

        return res.status(200).json({
            success: true,
            data: membersWithCompany,
        });
    } catch (error) {
        console.error("Error fetching company team:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

export default router;