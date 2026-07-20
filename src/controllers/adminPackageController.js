// src/controllers/adminPackageController.js
console.log("🔵 adminPackageController.js loaded!");

import { prisma } from "../lib/prisma.js";
import {
    SUBSCRIPTION_PLANS,
    BANNER_PACKAGES,
    SPONSORED_CONTENT_PACKAGES,
    RECRUITMENT_PACKAGES,
} from "../lib/packages.js";

console.log("✅ Package data imported:", {
    subscriptionPlans: SUBSCRIPTION_PLANS.length,
    bannerPackages: BANNER_PACKAGES.length,
    sponsoredPackages: SPONSORED_CONTENT_PACKAGES.length,
    recruitmentPackages: RECRUITMENT_PACKAGES.length,
});

// =====================
// GET ALL PACKAGES (Merge DB overrides with fallback)
// =====================
export const getPackages = async (req, res) => {
    console.log("🔥 getPackages called!");
    console.log("📝 Query params:", req.query);

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

        console.log("🔍 Looking for packages with where:", where);

        // 1. Get all packages from DB (overrides + brand-new ones)
        let dbPackages = await prisma.package.findMany({
            where,
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        });

        console.log(`📦 Found ${dbPackages.length} packages in DB`);

        // 2. Build fallback data from hardcoded packages
        let fallbackData = [];

        // SUBSCRIPTION plans
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
                    displayOrder: plan.id === "free" ? 0 : plan.id === "basic" ? 1 : plan.id === "professional" ? 2 : 3,
                    isHighlighted: plan.id === "professional",
                    isActive: true,
                    metadata: null,
                    fromFallback: true,
                })),
            ];
        }

        // BANNER packages
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
                    fromFallback: true,
                })),
            ];
        }

        // SPONSORED packages
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
                    fromFallback: true,
                })),
            ];
        }

        // RECRUITMENT packages
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
                    fromFallback: true,
                })),
            ];
        }

        // 3. Create a map of DB packages by ID for quick lookup
        const dbPackageMap = {};
        dbPackages.forEach((pkg) => {
            dbPackageMap[pkg.id] = pkg;
        });

        // 4. Merge: DB overrides fallback (for ids that exist in both)
        const fallbackIds = new Set(fallbackData.map((p) => p.id));

        const mergedPackages = fallbackData.map((fallbackPkg) => {
            if (dbPackageMap[fallbackPkg.id]) {
                const dbPkg = dbPackageMap[fallbackPkg.id];
                return {
                    ...fallbackPkg,
                    id: fallbackPkg.id,
                    name: dbPkg.name || fallbackPkg.name,
                    price: dbPkg.price !== undefined ? dbPkg.price : fallbackPkg.price,
                    billingCycle: dbPkg.billingCycle || fallbackPkg.billingCycle,
                    description: dbPkg.description || fallbackPkg.description,
                    badge: dbPkg.badge || fallbackPkg.badge,
                    displayOrder: dbPkg.displayOrder !== undefined ? dbPkg.displayOrder : fallbackPkg.displayOrder,
                    isHighlighted: dbPkg.isHighlighted !== undefined ? dbPkg.isHighlighted : fallbackPkg.isHighlighted,
                    isActive: dbPkg.isActive !== undefined ? dbPkg.isActive : fallbackPkg.isActive,
                    metadata: dbPkg.metadata || fallbackPkg.metadata,
                    fromFallback: false,
                };
            }
            return fallbackPkg;
        });

        // 4b. Add DB packages that have NO hardcoded fallback counterpart
        // (e.g. new packages created via the admin "Add" button, or ones
        // whose id doesn't match any hardcoded fallback id). Without this
        // step, freshly created packages exist in the DB but never show
        // up in the merged list because the merge only walks fallbackData.
        const extraDbPackages = dbPackages
            .filter((pkg) => !fallbackIds.has(pkg.id))
            .map((pkg) => ({
                id: pkg.id,
                name: pkg.name,
                type: pkg.type,
                price: pkg.price,
                billingCycle: pkg.billingCycle,
                description: pkg.description,
                badge: pkg.badge,
                displayOrder: pkg.displayOrder,
                isHighlighted: pkg.isHighlighted,
                isActive: pkg.isActive,
                metadata: pkg.metadata,
                fromFallback: false,
                createdAt: pkg.createdAt,
                updatedAt: pkg.updatedAt,
            }));

        mergedPackages.push(...extraDbPackages);

        // Keep a stable, sensible order across sections
        mergedPackages.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        console.log(`✅ Returning ${mergedPackages.length} merged packages`);

        res.status(200).json({
            success: true,
            data: mergedPackages,
            fromFallback: dbPackages.length === 0,
            message: dbPackages.length === 0 ? "Using fallback packages" : "Merged DB overrides with fallback",
        });
    } catch (error) {
        console.error("❌ Error fetching packages:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
        });
    }
};

// =====================
// GET SINGLE PACKAGE
// =====================
export const getPackageById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try to get from DB first
        let pkg = await prisma.package.findUnique({
            where: { id },
        });

        // If not in DB or deleted, check fallback
        if (!pkg || pkg.deletedAt) {
            const allFallback = [
                ...SUBSCRIPTION_PLANS.map((plan) => ({
                    id: plan.id,
                    name: plan.name,
                    type: "SUBSCRIPTION",
                    price: plan.price,
                    billingCycle: "ANNUAL",
                    description: `${plan.name} subscription plan`,
                    badge: null,
                    displayOrder: plan.id === "free" ? 0 : plan.id === "basic" ? 1 : plan.id === "professional" ? 2 : 3,
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
// UPSERT PACKAGE (Create or Update)
// =====================
export const upsertPackage = async (req, res) => {
    try {
        const {
            id,
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

        console.log("📝 Upserting package:", { id, name, type, price });

        // Validate required fields
        if (!id || !name || !type || price === undefined || !billingCycle) {
            return res.status(400).json({
                success: false,
                error: "ID, name, type, price, and billing cycle are required",
            });
        }

        // Validate price
        if (typeof price !== "number" || price < 0) {
            return res.status(400).json({
                success: false,
                error: "Price must be a positive number",
            });
        }

        // Upsert: update if exists, create if not
        const pkg = await prisma.package.upsert({
            where: { id },
            update: {
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
                deletedAt: null,
            },
            create: {
                id,
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

        console.log("✅ Package saved:", pkg.id);

        res.status(200).json({
            success: true,
            data: pkg,
            message: "Package saved successfully",
        });
    } catch (error) {
        console.error("Error saving package:", error);
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

        await prisma.package.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
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

// =====================
// GET ALL COMPANIES WITH USAGE DATA
// =====================
export const getAllCompaniesWithUsage = async (req, res) => {
    try {
        const companies = await prisma.company.findMany({
            include: {
                _count: {
                    select: {
                        User: true,
                        Post: true,
                        Job: true,
                        SupplierDirectory: true,
                        PackagePurchase: true,
                    },
                },
            },
        });

        res.status(200).json({
            success: true,
            data: companies,
        });
    } catch (error) {
        console.error("Error fetching companies:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// =====================
// GET SINGLE COMPANY USAGE DETAILS
// =====================
export const getCompanyUsageDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                User: true,
                Post: true,
                Job: true,
                SupplierDirectory: true,
                PackagePurchase: true,
            },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                error: "Company not found",
            });
        }

        res.status(200).json({
            success: true,
            data: company,
        });
    } catch (error) {
        console.error("Error fetching company usage:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};

// =====================
// GET PLATFORM STATS
// =====================
export const getPlatformStats = async (req, res) => {
    try {
        const [totalCompanies, totalUsers, totalPackages] = await Promise.all([
            prisma.company.count(),
            prisma.user.count(),
            prisma.packagePurchase.count({ where: { status: "PAID" } }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalCompanies,
                totalUsers,
                totalPackages,
            },
        });
    } catch (error) {
        console.error("Error fetching platform stats:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
};