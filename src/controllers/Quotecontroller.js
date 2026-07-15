// controllers/quoteController.js
import { prisma } from "../lib/prisma.js";
import { resolveLeadUserInfo } from "../lib/leadHelpers.js";

// POST /api/suppliers/:slug/quote-request
export const createQuoteRequest = async (req, res) => {
    try {
        const { slug } = req.params;
        const { fullName, email, phoneNumber, companyName, message } = req.body;

        // Validation
        if (!fullName || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Full name, email, and message are required fields"
            });
        }

        // Find supplier
        const supplier = await prisma.supplierDirectory.findUnique({
            where: { slug },
            include: {
                Company: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        subscriptionPlan: true,
                    }
                }
            }
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        // Resolve user info with package details
        const userInfo = await resolveLeadUserInfo(email);

        // Create the lead — only fields that exist on the Lead model
        const lead = await prisma.lead.create({
            data: {
                source: "QUOTE",
                supplierId: supplier.id,
                fullName,
                email,
                phoneNumber: phoneNumber || null,
                companyName: companyName || null,
                message,
                userId: userInfo.userId,
                companyId: userInfo.companyId,
                hasPackage: userInfo.hasPackage,
                planName: userInfo.planName,
                status: "NEW",
                // ✅ removed `metadata` — Lead model has no such column
            }
        });

        // Also create a contact message for the supplier
        await prisma.contactMessage.create({
            data: {
                fullName,
                email,
                phoneNumber: phoneNumber || null,
                website: supplier.website || null,
                message: `Quote Request for: ${supplier.name}\n\n${message}`,
                status: "NEW"
            }
        });

        // Return the lead with package info
        res.status(201).json({
            success: true,
            message: "Quote request submitted successfully",
            data: {
                ...lead,
                packageDetails: userInfo.packageDetails,
                hasPackage: userInfo.hasPackage,
                planName: userInfo.planName
            }
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

// GET /api/quotes/supplier/:supplierId - Get quotes for a specific supplier
export const getSupplierQuotes = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const userId = req.user?.id;

        // Check if user has access to this supplier
        const supplier = await prisma.supplierDirectory.findUnique({
            where: { id: parseInt(supplierId) },
            select: { companyId: true }
        });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }

        // Check if user is the owner or admin
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { companyId: true, role: true }
        });

        if (user?.role !== 'admin' && user?.companyId !== supplier.companyId) {
            return res.status(403).json({
                success: false,
                message: "Access denied"
            });
        }

        const leads = await prisma.lead.findMany({
            where: {
                supplierId: parseInt(supplierId),
                source: "QUOTE"
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        // Enrich leads with package info
        const enrichedLeads = await Promise.all(
            leads.map(async (lead) => {
                let packageDetails = null;
                if (lead.userId) {
                    const userInfo = await resolveLeadUserInfo(lead.email);
                    packageDetails = userInfo.packageDetails;
                }
                return {
                    ...lead,
                    packageDetails,
                    hasPackage: lead.hasPackage || !!packageDetails,
                    planName: lead.planName || packageDetails?.planLabel || null
                };
            })
        );

        res.status(200).json({
            success: true,
            count: enrichedLeads.length,
            data: enrichedLeads
        });

    } catch (error) {
        console.error("Error fetching supplier quotes:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch quotes",
            error: error.message
        });
    }
};