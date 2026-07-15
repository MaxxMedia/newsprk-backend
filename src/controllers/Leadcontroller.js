import { prisma } from "../lib/prisma.js";

const VALID_STATUSES = ["NEW", "IN_PROGRESS", "QUALIFIED", "CLOSED"];

function parseOptionalInt(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

function escapeCsvValue(value) {
    if (value === null || value === undefined) {
        return "";
    }

    const stringValue = String(value);
    if (/[",\r\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

async function buildScopedLeadWhere(req) {
    const { source, status } = req.query;
    const supplierId = parseOptionalInt(req.query.supplierId);
    const where = {};

    if (source) where.source = source;
    if (status) where.status = status;
    if (supplierId !== null) where.supplierId = supplierId;

    if (req.user?.role === "admin") {
        return where;
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user?.id },
        select: { companyId: true },
    });

    if (!user?.companyId) {
        return {
            ...where,
            supplierId: -1,
        };
    }

    const suppliers = await prisma.supplierDirectory.findMany({
        where: { companyId: user.companyId },
        select: { id: true },
    });

    const supplierIds = suppliers.map((supplier) => supplier.id);
    if (!supplierIds.length) {
        return {
            ...where,
            supplierId: -1,
        };
    }

    if (supplierId !== null && !supplierIds.includes(supplierId)) {
        return {
            ...where,
            supplierId: -1,
        };
    }

    return {
        ...where,
        supplierId: supplierId ?? { in: supplierIds },
    };
}

async function fetchScopedLeads(req) {
    const where = await buildScopedLeadWhere(req);

    return prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });
}

// GET /api/leads?source=CONTACT&status=NEW
export const getAllLeads = async (req, res) => {
    try {
        const { source, status } = req.query;

        const where = {};
        if (source) where.source = source;
        if (status) where.status = status;

        const leads = await prisma.lead.findMany({
            where,
            orderBy: { createdAt: "desc" }
        });

        res.status(200).json({
            success: true,
            count: leads.length,
            data: leads
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
        const lead = await prisma.lead.findUnique({
            where: { id: parseInt(id) }
        });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }

        res.status(200).json({
            success: true,
            data: lead
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

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      })
    }

        const lead = await prisma.lead.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        res.status(200).json({
            success: true,
            message: "Lead status updated successfully",
            data: lead
        });
    } catch (error) {
        console.error("Error updating lead status:", error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }
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
        await prisma.lead.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({
            success: true,
            message: "Lead deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting lead:", error);
        if (error.code === "P2025") {
            return res.status(404).json({
                success: false,
                message: "Lead not found"
            });
        }
        res.status(500).json({
            success: false,
            message: "Failed to delete lead",
            error: error.message
        });
    }
};

// GET /api/recruiters/leads
export const getLeads = async (req, res) => {
    try {
        const leads = await fetchScopedLeads(req);

        res.status(200).json({
            success: true,
            count: leads.length,
            data: leads,
        });
    } catch (error) {
        console.error("Error fetching recruiter leads:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch leads",
            error: error.message,
        });
    }
};

// GET /api/recruiters/leads/download
export const downloadLeadsCSV = async (req, res) => {
    try {
        const leads = await fetchScopedLeads(req);
        const headers = [
            "id",
            "source",
            "supplierId",
            "userId",
            "companyId",
            "fullName",
            "email",
            "phoneNumber",
            "website",
            "companyName",
            "message",
            "hasPackage",
            "planName",
            "status",
            "createdAt",
            "updatedAt",
        ];

        const rows = leads.map((lead) =>
            headers
                .map((header) => {
                    const value = lead[header];
                    if (value instanceof Date) {
                        return escapeCsvValue(value.toISOString());
                    }
                    return escapeCsvValue(value);
                })
                .join(",")
        );

        const csv = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="leads.csv"');
        res.status(200).send(csv);
    } catch (error) {
        console.error("Error downloading leads CSV:", error);
        res.status(500).json({
            success: false,
            message: "Failed to download leads CSV",
            error: error.message,
        });
    }
};

// GET /api/leads/package-summary
export const getLeadPackageSummary = async (req, res) => {
    try {
        const leads = await fetchScopedLeads(req);
        const byPlan = {};

        for (const lead of leads) {
            const key = lead.planName || "No Plan";
            byPlan[key] = (byPlan[key] || 0) + 1;
        }

        const withPackage = leads.filter((lead) => lead.hasPackage).length;

        res.status(200).json({
            success: true,
            data: {
                total: leads.length,
                withPackage,
                withoutPackage: leads.length - withPackage,
                byPlan,
            },
        });
    } catch (error) {
        console.error("Error fetching lead package summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch lead package summary",
            error: error.message,
        });
    }
};
