// lib/leadHelpers.js
import { prisma } from "./prisma.js";
import { getActiveSubscription } from "./packagePurchases.js";
import { getPlanLabel } from "./packagePricing.js";

/**
 * Resolve user information from email
 * Checks if user exists, their company, and package info
 */
export const resolveLeadUserInfo = async (email) => {
    let userId = null;
    let companyId = null;
    let hasPackage = false;
    let planName = null;
    let packageType = null;
    let packageId = null;
    let packageDetails = null;

    try {
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                companyId: true,
                role: true,
                fullName: true,
                Company: {
                    select: {
                        id: true,
                        name: true,
                        subscriptionPlan: true,
                        subscriptionExpiresAt: true,
                        slug: true,
                    }
                }
            }
        });

        if (user) {
            userId = user.id;

            if (user.companyId) {
                companyId = user.companyId;

                // Check if user's company has an active subscription
                if (user.Company?.subscriptionPlan) {
                    const activeSubscription = await getActiveSubscription(companyId, prisma);
                    if (activeSubscription && activeSubscription.plan !== 'free') {
                        hasPackage = true;
                        planName = getPlanLabel(activeSubscription.plan);
                        packageType = 'SUBSCRIPTION';
                        packageId = activeSubscription.plan;
                        packageDetails = {
                            plan: activeSubscription.plan,
                            planLabel: planName,
                            expiresAt: user.Company.subscriptionExpiresAt,
                            isActive: user.Company.subscriptionExpiresAt
                                ? new Date(user.Company.subscriptionExpiresAt) > new Date()
                                : false
                        };
                    }
                }
            }
        }

        // If no user found, check if email belongs to a company
        if (!userId) {
            const company = await prisma.company.findFirst({
                where: {
                    OR: [
                        { email: email },
                        { website: { contains: email.split('@')[1] } }
                    ]
                },
                select: {
                    id: true,
                    name: true,
                    subscriptionPlan: true,
                    subscriptionExpiresAt: true,
                    slug: true,
                }
            });

            if (company) {
                companyId = company.id;
                if (company.subscriptionPlan && company.subscriptionPlan !== 'free') {
                    const activeSubscription = await getActiveSubscription(companyId, prisma);
                    if (activeSubscription && activeSubscription.plan !== 'free') {
                        hasPackage = true;
                        planName = getPlanLabel(activeSubscription.plan);
                        packageType = 'SUBSCRIPTION';
                        packageId = activeSubscription.plan;
                        packageDetails = {
                            plan: activeSubscription.plan,
                            planLabel: planName,
                            expiresAt: company.subscriptionExpiresAt,
                            isActive: company.subscriptionExpiresAt
                                ? new Date(company.subscriptionExpiresAt) > new Date()
                                : false
                        };
                    }
                }
            }
        }

        // If still no package, check PackagePurchase table directly
        if (!hasPackage && userId) {
            const activePurchase = await prisma.packagePurchase.findFirst({
                where: {
                    userId: userId,
                    status: 'PAID',
                    OR: [
                        { expiresAt: { gte: new Date() } },
                        { expiresAt: null }
                    ]
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            if (activePurchase) {
                hasPackage = true;
                planName = activePurchase.packageName || activePurchase.packageType;
                packageType = activePurchase.packageType;
                packageId = activePurchase.packageId;
                packageDetails = {
                    type: activePurchase.packageType,
                    name: activePurchase.packageName,
                    amount: activePurchase.amount,
                    currency: activePurchase.currency,
                    expiresAt: activePurchase.expiresAt,
                    isActive: activePurchase.expiresAt
                        ? new Date(activePurchase.expiresAt) > new Date()
                        : true
                };
            }
        }

        return {
            userId,
            companyId,
            hasPackage,
            planName,
            packageType,
            packageId,
            packageDetails
        };

    } catch (error) {
        console.error("Error resolving lead user info:", error);
        return {
            userId: null,
            companyId: null,
            hasPackage: false,
            planName: null,
            packageType: null,
            packageId: null,
            packageDetails: null
        };
    }
};

/**
 * Get package tier from plan name
 */
export const getPackageTier = (planName) => {
    if (!planName) return null;

    const plan = planName.toLowerCase();
    if (plan.includes('free')) return 'free';
    if (plan.includes('basic')) return 'basic';
    if (plan.includes('professional')) return 'professional';
    if (plan.includes('enterprise')) return 'enterprise';
    if (plan.includes('premium')) return 'premium';
    if (plan.includes('gold')) return 'gold';
    if (plan.includes('silver')) return 'silver';
    if (plan.includes('bronze')) return 'bronze';
    return null;
};

/**
 * Check if a user/company has an active package
 */
export const hasActivePackage = async (userId, companyId) => {
    try {
        if (companyId) {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: {
                    subscriptionPlan: true,
                    subscriptionExpiresAt: true,
                }
            });

            if (company?.subscriptionPlan && company.subscriptionPlan !== 'free') {
                if (!company.subscriptionExpiresAt || new Date(company.subscriptionExpiresAt) > new Date()) {
                    return true;
                }
            }
        }

        if (userId) {
            const activePurchase = await prisma.packagePurchase.findFirst({
                where: {
                    userId: userId,
                    status: 'PAID',
                    OR: [
                        { expiresAt: { gte: new Date() } },
                        { expiresAt: null }
                    ]
                }
            });

            if (activePurchase) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error("Error checking active package:", error);
        return false;
    }
};

/**
 * ✅ NEW: Resolve a company's CURRENT package/plan info directly by companyId.
 *
 * This is the preferred path for enriching leads in bulk (admin/recruiter
 * lead lists), because `Lead.companyId` is already stored on the row at
 * creation time — there's no need to re-look-up the submitter's user/email
 * to find their company again. Callers should batch this per unique
 * companyId (not once per lead) to avoid N+1 queries.
 */
export const getCompanyPackageDetails = async (companyId) => {
    if (!companyId) {
        return { hasPackage: false, planId: null, planName: null, packageDetails: null };
    }

    try {
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { subscriptionPlan: true, subscriptionExpiresAt: true },
        });

        if (!company) {
            return { hasPackage: false, planId: null, planName: null, packageDetails: null };
        }

        // getActiveSubscription already knows how to downgrade an expired
        // plan back to 'free' — trust it as the source of truth for the
        // *effective* plan, same as everywhere else in this codebase.
        const activeSubscription = await getActiveSubscription(companyId, prisma);
        const plan = activeSubscription?.plan ?? 'free';

        if (plan === 'free') {
            return { hasPackage: false, planId: 'free', planName: null, packageDetails: null };
        }

        const planLabel = getPlanLabel(plan);
        const expiresAt = company.subscriptionExpiresAt ?? null;

        return {
            hasPackage: true,
            planId: plan,
            planName: planLabel,
            packageDetails: {
                plan,
                planLabel,
                expiresAt,
                isActive: expiresAt ? new Date(expiresAt) > new Date() : true,
            },
        };
    } catch (error) {
        console.error("Error resolving company package details:", error);
        return { hasPackage: false, planId: null, planName: null, packageDetails: null };
    }
};