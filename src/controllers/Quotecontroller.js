import { prisma } from "../lib/prisma.js";
import { resolveLeadUserInfo } from "../lib/leadHelpers.js";

// POST /api/suppliers/:slug/quote-request
export const createQuoteRequest = async (req, res) => {
    try {
        const { slug } = req.params;
        const { fullName, email, phoneNumber, companyName, message } = req.body;

        if (!fullName || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, and message are required fields"
            });
        }

        const supplier = await prisma.supplierDirectory.findUnique({
            where: { slug }
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        const { userId, companyId, hasPackage, planName } =
            await resolveLeadUserInfo(email);

        const lead = await prisma.lead.create({
            data: {
                source: "QUOTE",
                supplierId: supplier.id,
                fullName,
                email,
                phoneNumber: phoneNumber || null,
                companyName: companyName || null,
                message,
                userId,
                companyId,
                hasPackage,
                planName,
                status: "NEW"
            }
        });

        res.status(201).json({
            success: true,
            message: "Quote request submitted successfully",
            data: lead
        });
    } catch (error) {
        console.error("Error creating quote request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit quote request",
            error: error.message
        });
    }
};