import { prisma } from "./prisma.js";

/**
 * Given an email address submitted on a public form (Contact Us or
 * Request Quote), resolve it against the User table and figure out
 * whether that user's company (or the user directly) has a PAID
 * PackagePurchase.
 *
 * Returns an object that can be spread directly into a Lead `data` payload:
 *   { userId, companyId, companyName, hasPackage, planName }
 *
 * If no matching user is found, every field is null/false — this is not
 * an error, it just means the lead is from someone not registered yet.
 */
export const resolveLeadUserInfo = async (email) => {
    const defaults = {
        userId: null,
        companyId: null,
        companyName: null,
        hasPackage: false,
        planName: null
    };

    if (!email) {
        return defaults;
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { Company: true }
    });

    if (!user) {
        return defaults;
    }

    const companyId = user.companyId || null;
    const companyName = user.Company ? user.Company.name : null;

    // A PAID package can be tied to the user directly (individual purchase)
    // or to their company (company-wide purchase) — check both.
    const paidPurchase = await prisma.packagePurchase.findFirst({
        where: {
            status: "PAID",
            OR: [
                { userId: user.id },
                ...(companyId ? [{ companyId }] : [])
            ]
        },
        orderBy: { createdAt: "desc" }
    });

    return {
        userId: user.id,
        companyId,
        companyName,
        hasPackage: !!paidPurchase,
        planName: paidPurchase ? paidPurchase.packageName : null
    };
};