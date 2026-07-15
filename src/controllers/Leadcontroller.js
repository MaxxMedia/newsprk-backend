// controllers/leadController.js
import { prisma } from "../lib/prisma.js";
import { getCompanyPackageDetails } from "../lib/leadHelpers.js";

const VALID_STATUSES = ["NEW", "IN_PROGRESS", "QUALIFIED", "CLOSED"];
const VALID_PLANS = ["free", "basic", "professional", "enterprise"];

async function getRequestingUser(userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, companyId: true },
    });
}

/**
 * Batch-resolve package details for a set of leads by their (unique)
 * companyId, instead of doing a full email/user lookup per lead.
 * This is the fix for the N+1 query pattern that used to run
 * resolveLeadUserInfo(lead.email) once per lead.
 */
async function buildPackageDetailsMap(companyIds) {
    const uniqueIds = [...new Set(companyIds.filter(Boolean))];
    const entries = await Promise.all(
        uniqueIds.map(async (id) => [id, await getCompanyPackageDetails(id)])
    );
    return new Map(entries);
}

function enrichLead(lead, packageMap) {
    const details = lead.companyId ? packageMap.get(lead.companyId) : null;

    return {
        ...lead,
        // Prefer the live company plan when we can resolve one; otherwise
        // fall back to what was captured on the lead at submission time.
        hasPackage: details ? details.hasPackage : lead.hasPackage,
        planName: details ? details.planName : lead.planName,
        packageType: details?.packageDetails ? "SUBSCRIPTION" : null,
        packageDetails: details?.packageDetails ?? null,
    };
}

// GET /api/leads
// Admin: sees all leads (optionally filtered by ?companyId=).
// Recruiter / any other authenticated company user: auto-scoped to their own company.
export const getAllLeads = async (req, res) => {
    try {
        const { source, status, packageFilter, plan, companyId } = req.query;
        const userId = req.user?.id;

        const requester = await getRequestingUser(userId);
        if (!requester) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const where = {};
        if (source) where.source = source;
        if (status) where.status = status;

        if (requester.role === "admin") {
            if (companyId) where.companyId = parseInt(companyId);
        } else {
            if (!requester.companyId) {
                return res.status(200).json({
                    success: true,
                    count: 0,
                    data: [],
                    summary: { total: 0, withPackage: 0, withoutPackage: 0, byPlan: {} },
                    message: "You are not linked to any company.",
                });
            }
            // Non-admins are always scoped to their own company,
            // regardless of any ?companyId= they might pass.
            where.companyId = requester.companyId;
        }

        const leads = await prisma.lead.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        const packageMap = await buildPackageDetailsMap(leads.map((l) => l.companyId));
        let enrichedLeads = leads.map((lead) => enrichLead(lead, packageMap));

        // Filter by a specific plan (free | basic | professional | enterprise)
        if (plan && VALID_PLANS.includes(plan)) {
            enrichedLeads = enrichedLeads.filter((lead) => {
                const details = lead.companyId ? packageMap.get(lead.companyId) : null;
                const leadPlanId = details?.planId ?? "free";
                return leadPlanId === plan;
            });
        }

        // Filter by has-package / no-package
        let filteredLeads = enrichedLeads;
        if (packageFilter === "with-package") {
            filteredLeads = enrichedLeads.filter((lead) => lead.hasPackage === true);
        } else if (packageFilter === "without-package") {
            filteredLeads = enrichedLeads.filter((lead) => lead.hasPackage === false);
        }

        // Summary is computed off the plan-filtered set (before package-filter),
        // same behavior as before.
        const summary = {
            total: enrichedLeads.length,
            withPackage: enrichedLeads.filter((l) => l.hasPackage).length,
            withoutPackage: enrichedLeads.filter((l) => !l.hasPackage).length,
            byPlan: {},
        };

        enrichedLeads.forEach((lead) => {
            if (lead.planName) {
                summary.byPlan[lead.planName] = (summary.byPlan[lead.planName] || 0) + 1;
            }
        });

        res.status(200).json({
            success: true,
            count: filteredLeads.length,
            data: filteredLeads,
            summary,
        });

    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch leads",
            error: error.message
        });
    }
};

// GET /api/leads/:id
export const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const lead = await prisma.lead.findUnique({
            where: { id: parseInt(id) }
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        const user = await getRequestingUser(userId);

        if (user?.role !== 'admin' && user?.companyId !== lead.companyId) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const details = lead.companyId ? await getCompanyPackageDetails(lead.companyId) : null;

        res.status(200).json({
            success: true,
            data: {
                ...lead,
                hasPackage: details ? details.hasPackage : lead.hasPackage,
                planName: details ? details.planName : lead.planName,
                packageDetails: details?.packageDetails ?? null,
            }
        });

    } catch (error) {
        console.error("Error fetching lead:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lead",
            error: error.message
        });
    }
};

// PATCH /api/leads/:id/status
export const updateLeadStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user?.id;

        if (!VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
            });
        }

        const lead = await prisma.lead.findUnique({
            where: { id: parseInt(id) }
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        const user = await getRequestingUser(userId);

        if (user?.role !== 'admin' && user?.companyId !== lead.companyId) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const updated = await prisma.lead.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.status(200).json({
            success: true,
            message: "Lead status updated successfully",
            data: updated
        });

    } catch (error) {
        console.error("Error updating lead status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update lead status",
            error: error.message
        });
    }
};

// DELETE /api/leads/:id
export const deleteLead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const lead = await prisma.lead.findUnique({
            where: { id: parseInt(id) }
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        const user = await getRequestingUser(userId);

        if (user?.role !== 'admin' && user?.companyId !== lead.companyId) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        await prisma.lead.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({
            success: true,
            message: "Lead deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting lead:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete lead",
            error: error.message
        });
    }
};

// GET /api/leads/package-summary
export const getLeadPackageSummary = async (req, res) => {
    try {
        const userId = req.user?.id;

        const user = await getRequestingUser(userId);

        const where = {};
        if (user?.role !== 'admin' && user?.companyId) {
            where.companyId = user.companyId;
        }

        const leads = await prisma.lead.findMany({
            where,
            orderBy: { createdAt: "desc" }
        });

        const packageMap = await buildPackageDetailsMap(leads.map((l) => l.companyId));
        const enrichedLeads = leads.map((lead) => enrichLead(lead, packageMap));

        const summary = {
            total: enrichedLeads.length,
            withPackage: enrichedLeads.filter(l => l.hasPackage).length,
            withoutPackage: enrichedLeads.filter(l => !l.hasPackage).length,
            byPlan: {}
        };

        enrichedLeads.forEach(lead => {
            if (lead.planName) {
                summary.byPlan[lead.planName] = (summary.byPlan[lead.planName] || 0) + 1;
            }
        });

        res.status(200).json({
            success: true,
            summary
        });

    } catch (error) {
        console.error("Error fetching lead package summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lead summary",
            error: error.message
        });
    }
};