// controllers/adminPackageController.js

import prisma from "../prismaClient.js";
import {
    PLAN_ARTICLE_LIMITS,
    PLAN_PRODUCT_LISTING_LIMITS,
    PLAN_COVER_IMAGE_LIMITS,
    PLAN_WHATSAPP_ALLOWED,
    PLAN_TEAM_MEMBER_LIMITS,
    PLAN_PRODUCT_IMAGE_LIMITS,
    PLAN_COMPANY_PROFILE_LIMITS,
    getCompanyDirectoryCount,
    countWords,
} from "../lib/packageContentLimits.js";
import { getActiveSubscription } from "../lib/packagePurchases.js";

/* ==========================================================
   Small helpers so every "count vs limit" field is built the
   same way, with the SAME correct null-handling everywhere.

   CRITICAL: a plan limit of `null` means UNLIMITED. Never use
   `value ?? fallback` against these maps — `null ?? 0` silently
   evaluates to `0`, which is exactly the bug that was making
   Professional/Enterprise companies show a limit of 0 instead
   of Unlimited. Use resolvePlanLimit() below instead.
   ========================================================== */

function resolvePlanLimit(limitMap, plan) {
    return Object.prototype.hasOwnProperty.call(limitMap, plan)
        ? limitMap[plan]
        : limitMap.free;
}

function buildUsageField(count, limit, { countKey = "count" } = {}) {
    const isUnlimited = limit === null || limit === undefined;
    return {
        [countKey]: count,
        limit: isUnlimited ? "Unlimited" : limit,
        isUnlimited,
        remaining: isUnlimited ? "Unlimited" : Math.max(0, limit - count),
    };
}

function countFilled(arr) {
    if (!Array.isArray(arr)) return 0;
    return arr.filter((v) => v && String(v).trim().length > 0).length;
}

/**
 * Default (Free-plan) usage block for a recruiter who has no linked
 * company yet — every number is read from the same plan-limit maps
 * used everywhere else, so it stays correct if the Free plan changes.
 */
function buildNoCompanyUsage() {
    const freeProfile = PLAN_COMPANY_PROFILE_LIMITS.free;

    return {
        directories: buildUsageField(0, PLAN_PRODUCT_LISTING_LIMITS.free, { countKey: "active" }),
        articles: buildUsageField(0, PLAN_ARTICLE_LIMITS.free, { countKey: "active" }),
        teamMembers: buildUsageField(0, PLAN_TEAM_MEMBER_LIMITS.free, { countKey: "active" }),
        productSupplies: {
            count: 0,
            limit: PLAN_PRODUCT_LISTING_LIMITS.free === null ? "Unlimited" : PLAN_PRODUCT_LISTING_LIMITS.free,
            isUnlimited: PLAN_PRODUCT_LISTING_LIMITS.free === null,
        },
        coverImages: buildUsageField(0, PLAN_COVER_IMAGE_LIMITS.free),
        productImages: buildUsageField(0, PLAN_PRODUCT_IMAGE_LIMITS.free),
        companyGallery: buildUsageField(0, freeProfile.galleryImages),
        factoryGallery: buildUsageField(0, freeProfile.factoryImages),
        productCatalogues: buildUsageField(0, freeProfile.productCatalogues),
        productVideos: buildUsageField(0, freeProfile.productVideos),
        brands: buildUsageField(0, freeProfile.brandsRepresented),
        industriesServed: buildUsageField(0, freeProfile.industriesServed),
        exportMarkets: { count: 0, allowed: !!freeProfile.exportMarkets },
        certifications: { count: 0, allowed: !!freeProfile.certifications },
        brochures: { count: 0, allowed: !!freeProfile.brochures },
        manufacturingCapabilities: {
            allowed: !!freeProfile.manufacturingCapabilities,
            tier: freeProfile.manufacturingCapabilities,
        },
        machineryList: {
            allowed: !!freeProfile.machineryList,
            tier: freeProfile.machineryList,
        },
        qualityStandards: { allowed: !!freeProfile.qualityStandards },
        googleMap: { allowed: !!freeProfile.googleMap },
        whatsapp: { allowed: !!PLAN_WHATSAPP_ALLOWED.free },
        description: {
            limit: freeProfile.descriptionLimit === null ? "Unlimited" : freeProfile.descriptionLimit,
        },
    };
}

/**
 * Get every recruiter with their real plan and their own usage.
 *
 * IMPORTANT — this is deliberately one row PER RECRUITER, not per
 * company. The previous version only gave a standalone row to
 * recruiters with no company (hardcoded to Free/inactive/zero usage),
 * and folded every recruiter who *does* have a company into one
 * company-wide blended row — so a paid recruiter's real plan never
 * surfaced on its own, and there was no way to see what any single
 * recruiter personally submitted vs. their teammates.
 *
 * Now: every recruiter user gets a row. If they belong to a company,
 * the plan/subscription/spend is pulled from that company (the real
 * paid data). "active/pending" usage is THIS recruiter's own
 * submissions (matched via submittedById / createdById) — the shared
 * plan LIMIT still reflects the whole company's quota, since that's
 * what actually gets enforced, but the numbers used against it are
 * now attributable to a person.
 */
export const getAllCompaniesWithUsage = async (req, res) => {
    try {
        if (req.user.role?.toLowerCase() !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }

        const recruiters = await prisma.user.findMany({
            where: { role: "recruiter" },
            select: {
                id: true,
                email: true,
                username: true,
                fullName: true,
                createdAt: true,
                role: true,
                companyId: true,
                Company: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        location: true,
                        website: true,
                        isVerified: true,
                        subscriptionPlan: true,
                        subscriptionExpiresAt: true,
                        createdAt: true,
                        teamMembers: { select: { id: true, status: true } },
                        PackagePurchase: {
                            where: { status: "PAID" },
                            select: {
                                id: true,
                                packageName: true,
                                packageType: true,
                                amount: true,
                                startsAt: true,
                                expiresAt: true,
                                createdAt: true,
                            },
                            orderBy: { createdAt: "desc" },
                        },
                    },
                },
                // This recruiter's OWN submitted supplier directories —
                // this is the "how many used, how many pending" data that
                // was missing before: it only existed as a company-wide
                // blend, with no way to tell which recruiter did what.
                SupplierDirectory_SupplierDirectory_submittedByIdToUser: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        productSupplies: true,
                        productGallery: true,
                        companyGallery: true,
                        factoryGallery: true,
                        productCatalogues: true,
                        videoGallery: true,
                        brandsRepresented: true,
                        industriesServed: true,
                        exportMarkets: true,
                        coverImageUrl: true,
                        certifications: true,
                        companyBrochure: true,
                    },
                },
                // This recruiter's own articles.
                Post_Post_createdByIdToUser: {
                    where: { category: { slug: "articles" } },
                    select: { id: true, title: true, status: true, createdAt: true },
                },
            },
        });

        // Cache active-subscription lookups so a company with several
        // recruiters only has its plan resolved once.
        const subscriptionCache = new Map();
        async function resolveCompanySubscription(company) {
            if (!company) return null;
            if (subscriptionCache.has(company.id)) return subscriptionCache.get(company.id);
            const activeSubscription = await getActiveSubscription(company.id);
            subscriptionCache.set(company.id, activeSubscription);
            return activeSubscription;
        }

        // Cache the shared "total directories against the plan limit"
        // count per company too, for the same reason.
        const companyDirectoryCountCache = new Map();
        async function resolveCompanyDirectoryCount(companyId) {
            if (companyDirectoryCountCache.has(companyId)) return companyDirectoryCountCache.get(companyId);
            const count = await getCompanyDirectoryCount(companyId);
            companyDirectoryCountCache.set(companyId, count);
            return count;
        }

        const entries = await Promise.all(
            recruiters.map(async (recruiter) => {
                const company = recruiter.Company;
                const ownDirectories = recruiter.SupplierDirectory_SupplierDirectory_submittedByIdToUser || [];
                const ownArticles = recruiter.Post_Post_createdByIdToUser || [];

                const baseIdentity = {
                    id: recruiter.id,
                    name: recruiter.fullName || recruiter.username || "Unnamed Recruiter",
                    type: "recruiter",
                    email: recruiter.email,
                    username: recruiter.username,
                    fullName: recruiter.fullName,
                    createdAt: recruiter.createdAt,
                    users: [
                        {
                            id: recruiter.id,
                            email: recruiter.email,
                            username: recruiter.username,
                            fullName: recruiter.fullName,
                            role: recruiter.role,
                        },
                    ],
                };

                // ---- No company yet: genuinely free, genuinely zero ----
                if (!company) {
                    return {
                        ...baseIdentity,
                        hasCompany: false,
                        companyName: null,
                        location: null,
                        website: null,
                        isVerified: false,
                        subscriptionPlan: "free",
                        planLabel: "Free",
                        subscriptionExpiresAt: null,
                        isActiveSubscription: false,
                        totalSpent: 0,
                        latestPurchase: null,
                        usage: buildNoCompanyUsage(),
                    };
                }

                // ---- Has a company: pull the REAL plan/spend/usage ----
                const activeSubscription = await resolveCompanySubscription(company);
                const plan = activeSubscription?.plan || company.subscriptionPlan || "free";
                const planLabel =
                    activeSubscription?.planLabel ||
                    (plan === "free" ? "Free" : plan.charAt(0).toUpperCase() + plan.slice(1));

                const profileLimits = PLAN_COMPANY_PROFILE_LIMITS[plan] || PLAN_COMPANY_PROFILE_LIMITS.free;

                const articleLimit = resolvePlanLimit(PLAN_ARTICLE_LIMITS, plan);
                const productListingLimit = resolvePlanLimit(PLAN_PRODUCT_LISTING_LIMITS, plan);
                const coverImageLimit = resolvePlanLimit(PLAN_COVER_IMAGE_LIMITS, plan);
                const teamMemberLimit = resolvePlanLimit(PLAN_TEAM_MEMBER_LIMITS, plan);
                const productImageLimit = resolvePlanLimit(PLAN_PRODUCT_IMAGE_LIMITS, plan);

                // ---- This recruiter's own directories ----
                const approvedOwn = ownDirectories.filter((d) => d.status === "APPROVED");
                const pendingOwn = ownDirectories.filter((d) => d.status === "PENDING");

                // The limit is a shared account-wide quota, so "remaining"
                // is measured against everyone's usage on the company —
                // but active/pending below is THIS recruiter's own
                // contribution, which is the piece that was missing.
                const totalDirectoriesForLimit = await resolveCompanyDirectoryCount(company.id);

                // ---- This recruiter's own articles ----
                const approvedArticlesOwn = ownArticles.filter((p) => p.status === "APPROVED");
                const pendingArticlesOwn = ownArticles.filter((p) => p.status === "PENDING");

                // ---- Content counts, scoped to what THIS recruiter posted ----
                let productSupplyCount = 0;
                let productImageCount = 0;
                let companyGalleryCount = 0;
                let factoryGalleryCount = 0;
                let catalogueCount = 0;
                let videoCount = 0;
                let brandCount = 0;
                let industryServedCount = 0;
                let exportMarketCount = 0;
                let coverImageCount = 0;
                let certificationCount = 0;
                let brochureCount = 0;

                for (const dir of ownDirectories) {
                    productSupplyCount += countFilled(dir.productSupplies);
                    productImageCount += countFilled(dir.productGallery);
                    companyGalleryCount += countFilled(dir.companyGallery);
                    factoryGalleryCount += countFilled(dir.factoryGallery);
                    catalogueCount += countFilled(dir.productCatalogues);
                    videoCount += countFilled(dir.videoGallery);
                    brandCount += countFilled(dir.brandsRepresented);
                    industryServedCount += countFilled(dir.industriesServed);
                    exportMarketCount += countFilled(dir.exportMarkets);
                    certificationCount += countFilled(dir.certifications);
                    brochureCount += countFilled(dir.companyBrochure);

                    const covers = Array.isArray(dir.coverImageUrl)
                        ? dir.coverImageUrl
                        : dir.coverImageUrl
                            ? [dir.coverImageUrl]
                            : [];
                    coverImageCount += countFilled(covers);
                }

                // Team size is an account-level (company) fact, not a
                // per-recruiter one — shown for context only.
                const teamMemberCount = (company.teamMembers || []).filter((m) => m.status === "ACTIVE").length;

                const latestPurchase = company.PackagePurchase?.[0] || null;
                const totalSpent = company.PackagePurchase?.reduce((sum, p) => sum + p.amount, 0) || 0;

                return {
                    ...baseIdentity,
                    hasCompany: true,
                    companyName: company.name,
                    location: company.location,
                    website: company.website,
                    isVerified: company.isVerified,
                    subscriptionPlan: plan,
                    planLabel,
                    subscriptionExpiresAt: company.subscriptionExpiresAt,
                    isActiveSubscription: !!activeSubscription?.purchase,
                    totalSpent,
                    latestPurchase,
                    usage: {
                        directories: {
                            active: approvedOwn.length,
                            pending: pendingOwn.length,
                            total: approvedOwn.length + pendingOwn.length,
                            limit: productListingLimit === null ? "Unlimited" : productListingLimit,
                            isUnlimited: productListingLimit === null,
                            remaining:
                                productListingLimit === null
                                    ? "Unlimited"
                                    : Math.max(0, productListingLimit - totalDirectoriesForLimit),
                        },
                        articles: {
                            active: approvedArticlesOwn.length,
                            pending: pendingArticlesOwn.length,
                            total: approvedArticlesOwn.length + pendingArticlesOwn.length,
                            limit: articleLimit === null ? "Unlimited" : articleLimit,
                            isUnlimited: articleLimit === null,
                            remaining:
                                articleLimit === null
                                    ? "Unlimited"
                                    : Math.max(0, articleLimit - approvedArticlesOwn.length),
                        },
                        teamMembers: {
                            active: teamMemberCount,
                            limit: teamMemberLimit === null ? "Unlimited" : teamMemberLimit,
                            isUnlimited: teamMemberLimit === null,
                            remaining:
                                teamMemberLimit === null
                                    ? "Unlimited"
                                    : Math.max(0, teamMemberLimit - teamMemberCount),
                        },
                        productSupplies: {
                            count: productSupplyCount,
                            limit: productListingLimit === null ? "Unlimited" : productListingLimit,
                            isUnlimited: productListingLimit === null,
                        },
                        coverImages: buildUsageField(coverImageCount, coverImageLimit),
                        productImages: buildUsageField(productImageCount, productImageLimit),
                        companyGallery: buildUsageField(companyGalleryCount, profileLimits.galleryImages),
                        factoryGallery: buildUsageField(factoryGalleryCount, profileLimits.factoryImages),
                        productCatalogues: buildUsageField(catalogueCount, profileLimits.productCatalogues),
                        productVideos: buildUsageField(videoCount, profileLimits.productVideos),
                        brands: buildUsageField(brandCount, profileLimits.brandsRepresented),
                        industriesServed: buildUsageField(industryServedCount, profileLimits.industriesServed),
                        exportMarkets: { count: exportMarketCount, allowed: !!profileLimits.exportMarkets },
                        certifications: { count: certificationCount, allowed: !!profileLimits.certifications },
                        brochures: { count: brochureCount, allowed: !!profileLimits.brochures },
                        manufacturingCapabilities: {
                            allowed: !!profileLimits.manufacturingCapabilities,
                            tier: profileLimits.manufacturingCapabilities,
                        },
                        machineryList: {
                            allowed: !!profileLimits.machineryList,
                            tier: profileLimits.machineryList,
                        },
                        qualityStandards: { allowed: !!profileLimits.qualityStandards },
                        googleMap: { allowed: !!profileLimits.googleMap },
                        whatsapp: { allowed: !!profileLimits.whatsapp },
                        description: {
                            limit: profileLimits.descriptionLimit === null ? "Unlimited" : profileLimits.descriptionLimit,
                        },
                    },
                };
            })
        );

        const totalRecruiters = entries.length;
        const totalPaidCompanies = entries.filter((e) => e.isActiveSubscription).length;
        const totalFreeCompanies = totalRecruiters - totalPaidCompanies;

        const [
            totalPendingDirectories,
            totalPendingArticles,
            totalTeamMembers,
            totalSupplierDirectories,
            totalArticles,
        ] = await Promise.all([
            prisma.supplierDirectory.count({ where: { status: "PENDING" } }),
            prisma.post.count({ where: { status: "PENDING", category: { slug: "articles" } } }),
            prisma.companyTeamMember.count({ where: { status: "ACTIVE" } }),
            prisma.supplierDirectory.count({ where: { status: "APPROVED" } }),
            prisma.post.count({ where: { status: "APPROVED", category: { slug: "articles" } } }),
        ]);

        res.json({
            stats: {
                totalRecruiters,
                totalPaidCompanies,
                totalFreeCompanies,
                totalPendingDirectories,
                totalPendingArticles,
                totalTeamMembers,
                totalSupplierDirectories,
                totalArticles,
            },
            companies: entries,
        });
    } catch (err) {
        console.error("Admin package usage error:", err);
        res.status(500).json({ error: "Failed to fetch company usage data" });
    }
};

/**
 * Get a single company's detailed usage
 */
export const getCompanyUsageDetails = async (req, res) => {
    try {
        if (req.user.role?.toLowerCase() !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }

        const companyId = parseInt(req.params.id);

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            include: {
                User: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        fullName: true,
                        role: true,
                        createdAt: true,
                    },
                },
                SupplierDirectory: {
                    include: {
                        User_SupplierDirectory_submittedByIdToUser: {
                            select: {
                                id: true,
                                email: true,
                                username: true,
                            },
                        },
                    },
                },
                Post: {
                    where: {
                        category: { slug: "articles" },
                    },
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        createdAt: true,
                        views: true,
                        shares: true,
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                },
                teamMembers: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                username: true,
                                fullName: true,
                            },
                        },
                    },
                },
                PackagePurchase: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });

        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }

        const activeSubscription = await getActiveSubscription(company.id);
        const plan = activeSubscription?.plan || "free";
        const profileLimits = PLAN_COMPANY_PROFILE_LIMITS[plan] || PLAN_COMPANY_PROFILE_LIMITS.free;

        res.json({
            company,
            subscription: {
                plan,
                planLabel: activeSubscription?.planLabel || "Free",
                isActive: !!activeSubscription?.purchase,
                expiresAt: company.subscriptionExpiresAt,
            },
            planLimits: profileLimits,
            packagePurchases: company.PackagePurchase,
        });
    } catch (err) {
        console.error("Company usage details error:", err);
        res.status(500).json({ error: "Failed to fetch company details" });
    }
};

/**
 * Get overall platform usage stats
 */
export const getPlatformStats = async (req, res) => {
    try {
        if (req.user.role?.toLowerCase() !== "admin") {
            return res.status(403).json({ error: "Admin only" });
        }

        const [
            totalCompanies,
            totalUsers,
            totalPaidCompanies,
            totalFreeCompanies,
            totalSupplierDirectories,
            totalPendingDirectories,
            totalArticles,
            totalPendingArticles,
            totalTeamMembers,
            totalPackagePurchases,
            totalRevenue,
        ] = await Promise.all([
            prisma.company.count(),
            prisma.user.count(),
            prisma.company.count({ where: { subscriptionPlan: { not: "free" } } }),
            prisma.company.count({ where: { subscriptionPlan: "free" } }),
            prisma.supplierDirectory.count({ where: { status: "APPROVED" } }),
            prisma.supplierDirectory.count({ where: { status: "PENDING" } }),
            prisma.post.count({ where: { status: "APPROVED", category: { slug: "articles" } } }),
            prisma.post.count({ where: { status: "PENDING", category: { slug: "articles" } } }),
            prisma.companyTeamMember.count({ where: { status: "ACTIVE" } }),
            prisma.packagePurchase.count({ where: { status: "PAID" } }),
            prisma.packagePurchase.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
        ]);

        const planDistribution = await prisma.company.groupBy({
            by: ["subscriptionPlan"],
            _count: true,
        });

        const recentCompanies = await prisma.company.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, name: true, createdAt: true, subscriptionPlan: true },
        });

        const recentDirectories = await prisma.supplierDirectory.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { Company: { select: { name: true } } },
        });

        res.json({
            stats: {
                totalCompanies,
                totalUsers,
                totalPaidCompanies,
                totalFreeCompanies,
                totalSupplierDirectories,
                totalPendingDirectories,
                totalArticles,
                totalPendingArticles,
                totalTeamMembers,
                totalPackagePurchases,
                totalRevenue: totalRevenue._sum.amount || 0,
            },
            planDistribution,
            recentActivity: {
                companies: recentCompanies,
                directories: recentDirectories,
            },
        });
    } catch (err) {
        console.error("Platform stats error:", err);
        res.status(500).json({ error: "Failed to fetch platform stats" });
    }
};