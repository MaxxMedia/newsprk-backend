import { prisma } from "../lib/prisma.js";

const VALID_STATUSES = ["NEW", "IN_PROGRESS", "QUALIFIED", "CLOSED"];

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
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
            });
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