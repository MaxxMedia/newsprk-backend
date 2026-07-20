import { prisma } from "../lib/prisma.js";
import {
    SUBSCRIPTION_PLANS,
    BANNER_PACKAGES,
    SPONSORED_CONTENT_PACKAGES,
    RECRUITMENT_PACKAGES,
} from "../lib/packages.js";

// =====================
// GET ALL PACKAGES (with fallback)
// =====================
export const getPackages = async (req, res) => {
    try {
        const { type, includeInactive } = req.query;

        const where = {
            deletedAt: null,
        };

        if (type) {
            where.type = type;
        }

        if (!includeInactive) {
            where.isActive = true;
        }

        let dbPackages = await prisma.package.findMany({
            where,
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        });

        // If no packages in DB, return hardcoded data as fallback
        if (dbPackages.length === 0) {
            let fallbackData = [];

            if (!type || type === "SUBSCRIPTION") {
                fallbackData = [
                    ...fallbackData,
                    ...SUBSCRIPTION_PLANS.map((plan) => ({
                        id: plan.id,
                        name: plan.name,
                        type: "SUBSCRIPTION",
                        price: plan.price,
                        billingCycle: "ANNUAL",
                        description: `${plan.name} subscription plan`,
                        badge: null,
                        displayOrder:
                            plan.id === "free"
                                ? 0
                                : plan.id === "basic"
                                    ? 1
                                    : plan.id === "professional"
                                        ? 2
                                        : 3,
                        isHighlighted: plan.id === "professional",
                        isActive: true,
                        metadata: null,
                    })),
                ];
            }

            if (!type || type === "BANNER") {
                fallbackData = [
                    ...fallbackData,
                    ...BANNER_PACKAGES.map((pkg, index) => ({
                        id: pkg.id,
                        name: pkg.position,
                        type: "BANNER",
                        price: pkg.annual,
                        billingCycle: "ANNUAL",
                        description: `${pkg.position} banner package`,
                        badge: null,
                        displayOrder: index,
                        isHighlighted: index === 0,
                        isActive: true,
                        metadata: {
                            monthly: pkg.monthly,
                            quarterly: pkg.quarterly,
                            annual: pkg.annual,
                        },
                    })),
                ];
            }

            if (!type || type === "SPONSORED") {
                fallbackData = [
                    ...fallbackData,
                    ...SPONSORED_CONTENT_PACKAGES.map((pkg, index) => ({
                        id: pkg.id,
                        name: pkg.name,
                        type: "SPONSORED",
                        price: pkg.price,
                        billingCycle: "ONE_TIME",
                        description: `${pkg.name} sponsored content`,
                        badge: index === 1 ? "Best Value" : null,
                        displayOrder: index,
                        isHighlighted: index === 1,
                        isActive: true,
                        metadata: { features: pkg.features },
                    })),
                ];
            }

            if (!type || type === "RECRUITMENT") {
                fallbackData = [
                    ...fallbackData,
                    ...RECRUITMENT_PACKAGES.map((pkg, index) => ({
                        id: pkg.id,
                        name: pkg.name,
                        type: "RECRUITMENT",
                        price: pkg.price,
                        billingCycle: "MONTHLY",
                        description: "Monthly job posting package",
                        badge: null,
                        displayOrder: index,
                        isHighlighted: false,
                        isActive: true,
                        metadata: { durationDays: pkg.durationDays },
                    })),
                ];
            }

            // Filter by type if specified
            if (type) {
                fallbackData = fallbackData.filter((p) => p.type === type);
            }

            return res.status(200).json({
                success: true,
                data: fallbackData,
                fromFallback: true,
                message: "Using fallback packages from code",
            });
        }

        res.status(200).json({
            success: true,
            data: dbPackages,
            fromFallback: false,
        });
    } catch (error) {
        console.error("Error fetching packages:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// =====================
// GET SINGLE PACKAGE
// =====================
export const getPackageById = async (req, res) => {
    try {
        const { id } = req.params;

        let pkg = await prisma.package.findUnique({
            where: { id },
        });

        // If not found in DB, check fallback
        if (!pkg || pkg.deletedAt) {
            // Check all hardcoded packages
            const allFallback = [
                ...SUBSCRIPTION_PLANS.map((plan) => ({
                    id: plan.id,
                    name: plan.name,
                    type: "SUBSCRIPTION",
                    price: plan.price,
                    billingCycle: "ANNUAL",
                    description: `${plan.name} subscription plan`,
                    badge: null,
                    displayOrder:
                        plan.id === "free"
                            ? 0
                            : plan.id === "basic"
                                ? 1
                                : plan.id === "professional"
                                    ? 2
                                    : 3,
                    isHighlighted: plan.id === "professional",
                    isActive: true,
                    metadata: null,
                })),
                ...BANNER_PACKAGES.map((pkg, index) => ({
                    id: pkg.id,
                    name: pkg.position,
                    type: "BANNER",
                    price: pkg.annual,
                    billingCycle: "ANNUAL",
                    description: `${pkg.position} banner package`,
                    badge: null,
                    displayOrder: index,
                    isHighlighted: index === 0,
                    isActive: true,
                    metadata: { monthly: pkg.monthly, quarterly: pkg.quarterly, annual: pkg.annual },
                })),
                ...SPONSORED_CONTENT_PACKAGES.map((pkg, index) => ({
                    id: pkg.id,
                    name: pkg.name,
                    type: "SPONSORED",
                    price: pkg.price,
                    billingCycle: "ONE_TIME",
                    description: `${pkg.name} sponsored content`,
                    badge: index === 1 ? "Best Value" : null,
                    displayOrder: index,
                    isHighlighted: index === 1,
                    isActive: true,
                    metadata: { features: pkg.features },
                })),
                ...RECRUITMENT_PACKAGES.map((pkg, index) => ({
                    id: pkg.id,
                    name: pkg.name,
                    type: "RECRUITMENT",
                    price: pkg.price,
                    billingCycle: "MONTHLY",
                    description: "Monthly job posting package",
                    badge: null,
                    displayOrder: index,
                    isHighlighted: false,
                    isActive: true,
                    metadata: { durationDays: pkg.durationDays },
                })),
            ];

            const fallbackPkg = allFallback.find((p) => p.id === id);
            if (fallbackPkg) {
                return res.status(200).json({
                    success: true,
                    data: fallbackPkg,
                    fromFallback: true,
                });
            }

            return res.status(404).json({
                success: false,
                error: "Package not found",
            });
        }

        res.status(200).json({
            success: true,
            data: pkg,
            fromFallback: false,
        });
    } catch (error) {
        console.error("Error fetching package:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// =====================
// CREATE PACKAGE
// =====================
export const createPackage = async (req, res) => {
    try {
        const {
            name,
            type,
            price,
            billingCycle,
            description,
            badge,
            displayOrder,
            isHighlighted,
            isActive,
            metadata,
        } = req.body;

        // Validate required fields
        if (!name || !type || price === undefined || !billingCycle) {
            return res.status(400).json({
                success: false,
                error: "Name, type, price, and billing cycle are required",
            });
        }

        // Validate price
        if (typeof price !== "number" || price < 0) {
            return res.status(400).json({
                success: false,
                error: "Price must be a positive number",
            });
        }

        const pkg = await prisma.package.create({
            data: {
                name,
                type,
                price,
                billingCycle,
                description: description || null,
                badge: badge || null,
                displayOrder: displayOrder || 0,
                isHighlighted: isHighlighted || false,
                isActive: isActive !== undefined ? isActive : true,
                metadata: metadata || null,
            },
        });

        res.status(201).json({
            success: true,
            data: pkg,
            message: "Package created successfully",
        });
    } catch (error) {
        console.error("Error creating package:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// =====================
// UPDATE PACKAGE
// =====================
export const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            type,
            price,
            billingCycle,
            description,
            badge,
            displayOrder,
            isHighlighted,
            isActive,
            metadata,
        } = req.body;

        // Check if package exists
        const existing = await prisma.package.findUnique({
            where: { id },
        });

        if (!existing || existing.deletedAt) {
            return res.status(404).json({
                success: false,
                error: "Package not found",
            });
        }

        // Validate price if provided
        if (price !== undefined && (typeof price !== "number" || price < 0)) {
            return res.status(400).json({
                success: false,
                error: "Price must be a positive number",
            });
        }

        const pkg = await prisma.package.update({
            where: { id },
            data: {
                name: name || undefined,
                type: type || undefined,
                price: price !== undefined ? price : undefined,
                billingCycle: billingCycle || undefined,
                description: description !== undefined ? description : null,
                badge: badge !== undefined ? badge : null,
                displayOrder: displayOrder !== undefined ? displayOrder : undefined,
                isHighlighted: isHighlighted !== undefined ? isHighlighted : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
                metadata: metadata !== undefined ? metadata : null,
            },
        });

        res.status(200).json({
            success: true,
            data: pkg,
            message: "Package updated successfully",
        });
    } catch (error) {
        console.error("Error updating package:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// =====================
// DELETE PACKAGE (Soft Delete)
// =====================
export const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.package.findUnique({
            where: { id },
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: "Package not found",
            });
        }

        // Soft delete
        await prisma.package.update({
            where: { id },
            data: { deletedAt: new Date() },
        });

        res.status(200).json({
            success: true,
            message: "Package deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting package:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// =====================
// TOGGLE PACKAGE STATUS
// =====================
export const togglePackageStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.package.findUnique({
            where: { id },
        });

        if (!existing || existing.deletedAt) {
            return res.status(404).json({
                success: false,
                error: "Package not found",
            });
        }

        const pkg = await prisma.package.update({
            where: { id },
            data: { isActive: !existing.isActive },
        });

        res.status(200).json({
            success: true,
            data: pkg,
            message: `Package ${pkg.isActive ? "activated" : "deactivated"} successfully`,
        });
    } catch (error) {
        console.error("Error toggling package:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};