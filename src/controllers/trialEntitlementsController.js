import { prisma } from "../lib/prisma.js";
import { ACTIVE_PURCHASE_STATUSES } from "../lib/trialInfo.js";
export async function getContentEntitlements(req, res) {
  try {
    const type = req.query.type;
    if (!["BANNER", "SPONSORED"].includes(type)) return res.status(400).json({ error: "Invalid package type" });
    const purchases = await prisma.packagePurchase.findMany({
      where: { packageType: type, companyId: { not: null }, status: { in: ACTIVE_PURCHASE_STATUSES },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true, companyId: true, packageId: true, packageName: true, status: true, expiresAt: true, Company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(purchases);
  } catch (err) { console.error("Content entitlement lookup error:", err); res.status(500).json({ error: "Unable to load company packages" }); }
}
