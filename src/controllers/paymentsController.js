// controllers/paymentsController.js

import crypto from "crypto";
import { convertCompanyTrial } from "../lib/companyTrials.js";
import { getCompanyTrialInfo } from "../lib/trialInfo.js";
import RazorpayPkg from "razorpay";
import { prisma } from "../lib/prisma.js";
import { enforceCompanyJobVisibility } from "../lib/jobVisibility.js";
import { getPlanLabel, resolvePackage } from "../lib/packagePricing.js";
import {
  dedupeCompanyPurchases,
  buildSubscriptionDisplay,
  syncCompanySubscription,
} from "../lib/packagePurchases.js";
const Razorpay = RazorpayPkg.default || RazorpayPkg;

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function createPaymentOrder(req, res) {
  try {
    if (!["recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only recruiters can purchase packages" });
    }

    const { packageType, packageId } = req.body;
    const resolved = await resolvePackage(packageType, packageId, { requireActive: true });

    if (!resolved) {
      return res.status(400).json({ error: "Invalid package" });
    }

    if (resolved.amount <= 0) {
      return res.status(400).json({ error: "This package does not require payment" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, fullName: true, companyId: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const razorpay = getRazorpay();
    const amountPaise = resolved.amount * 100;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `pkg_${Date.now()}`,
      notes: {
        packageType: resolved.packageType,
        packageId: resolved.packageId,
        userId: String(user.id),
      },
    });

    const purchase = await prisma.packagePurchase.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        packageType: resolved.packageType,
        packageId: resolved.packageId,
        packageName: resolved.packageName,
        amount: resolved.amount,
        status: "PENDING",
        razorpayOrderId: order.id,
        metadata: { ...(resolved.metadata || {}), durationDays: resolved.durationDays ?? null },
      },
    });

    res.json({
      orderId: order.id,
      amount: amountPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      purchaseId: purchase.id,
      packageName: resolved.packageName,
      prefill: {
        name: user.fullName || "",
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Create payment order error:", err);
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code });
    res.status(500).json({
      error: err.message?.includes("Razorpay keys")
        ? "Payment gateway is not configured"
        : "Failed to create payment order",
    });
  }
}

export async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Missing payment details" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "Payment gateway is not configured" });
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const purchase = await prisma.packagePurchase.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!purchase) {
      return res.status(404).json({ error: "Purchase record not found" });
    }

    if (purchase.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not allowed" });
    }

    if (purchase.status === "PAID") {
      return res.json({ success: true, purchase });
    }

    const resolved = await resolvePackage(purchase.packageType, purchase.packageId);
    const startsAt = new Date();
    const durationDays = purchase.metadata?.durationDays !== undefined
      ? purchase.metadata.durationDays
      : resolved?.durationDays;
    const expiresAt = durationDays ? addDays(startsAt, durationDays) : null;

    // Commit the purchase and its entitlements together. A failed activation
    // must not leave the company upgraded with a PENDING purchase.
    const updated = await prisma.$transaction(async (tx) => {
      // Claim the order once, including when checkout callbacks race or retry.
      const claimed = await tx.packagePurchase.updateMany({
        where: { id: purchase.id, status: { not: "PAID" } },
        data: {
          status: "PAID",
          razorpayPaymentId: razorpay_payment_id,
          startsAt,
          expiresAt,
        },
      });

      if (claimed.count === 0) {
        return tx.packagePurchase.findUnique({ where: { id: purchase.id } });
      }

      let companyId = purchase.companyId;
      if (!companyId) {
        const user = await tx.user.findUnique({
          where: { id: purchase.userId },
          select: { companyId: true },
        });
        companyId = user?.companyId ?? null;
      }

      const paidPurchase = await tx.packagePurchase.update({
        where: { id: purchase.id },
        data: { companyId },
      });

      await tx.user.update({
        where: { id: purchase.userId },
        data: { packageSelected: true },
      });

      if (companyId) {
        // Read the newly PAID purchase through the same transaction so both
        // subscription tiers and recruitment slots are available immediately.
        await convertCompanyTrial(companyId, purchase.packageType, tx, startsAt);
        await syncCompanySubscription(companyId, tx);
        await enforceCompanyJobVisibility(companyId, tx);
      }

      return paidPurchase;
    }, { maxWait: 10000, timeout: 15000 });

    res.json({ success: true, purchase: updated });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
}
export async function activateFreePlan(req, res) {
  if (!["recruiter", "admin"].includes(req.user.role)) return res.status(403).json({ error: "Only company accounts can activate plans" });
  try {
    const result = await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id: req.user.id }, data: { packageSelected: true } });
      const user = await tx.user.findUnique({ where: { id: req.user.id } });
      let companyId = user.companyId;
      if (!companyId) {
        const company = await tx.company.create({ data: { name: (user.fullName || "User") + "'s Company", slug: "company-" + user.id + "-" + crypto.randomUUID().slice(0, 8) } });
        companyId = company.id;
        await tx.user.update({ where: { id: user.id }, data: { companyId } });
      }
      await tx.company.update({ where: { id: companyId }, data: { jobPostingCredits: { increment: 0 } } });
      const trial = await tx.companyTrial.findUnique({ where: { companyId } });
      if (trial && !trial.convertedAt && !trial.expiredAt) {
        const now = new Date();
        await tx.packagePurchase.update({ where: { id: trial.purchaseId }, data: { expiresAt: now } });
        await tx.companyTrial.update({ where: { companyId }, data: { expiredAt: now } });
      }
      let purchase = await tx.packagePurchase.findFirst({ where: { companyId, packageType: "SUBSCRIPTION", packageId: "free", status: "PAID" } });
      const alreadyActive = Boolean(purchase);
      if (!purchase) purchase = await tx.packagePurchase.create({ data: { userId: user.id, companyId, packageType: "SUBSCRIPTION", packageId: "free", packageName: "Free Subscription", amount: 0, status: "PAID", startsAt: new Date() } });
      await syncCompanySubscription(companyId, tx);
      await enforceCompanyJobVisibility(companyId, tx);
      return { purchase, alreadyActive };
    }, { maxWait: 10000, timeout: 15000 });
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("Activate free plan error:", err);
    return res.status(500).json({ error: "Failed to activate free plan" });
  }
}
export async function getMyPackageInfo(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        companyId: true,
        Company: {
          select: {
            subscriptionPlan: true,
            subscriptionExpiresAt: true,
            jobPostingCredits: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.companyId) {
      await syncCompanySubscription(user.companyId);

      const freshCompany = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: {
          subscriptionPlan: true,
          subscriptionExpiresAt: true,
          jobPostingCredits: true,
        },
      });
      user.Company = freshCompany;
    }

    const purchases = dedupeCompanyPurchases(
      await prisma.packagePurchase.findMany({
        where: user.companyId
          ? { companyId: user.companyId }
          : { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          packageType: true,
          packageId: true,
          packageName: true,
          amount: true,
          status: true,
          startsAt: true,
          expiresAt: true,
          createdAt: true,
        },
      })
    );

    const subscription = user.Company
      ? await buildSubscriptionDisplay(user.Company, user.companyId, prisma)
      : {
        plan: "free",
        planLabel: "Free",
        displayPlan: "free",
        displayPlanLabel: "Free",
        recruitmentExpiresAt: null,
        expiresAt: null,
        jobPostingCredits: 0,
        basePlanLabel: "Free",
      };

    res.json({
      trial: await getCompanyTrialInfo(user.companyId),
      subscription,
      purchases,
    });
  } catch (err) {
    console.error("Get package info error:", err);
    res.status(500).json({ error: "Failed to load package info" });
  }
}

export async function getAdminPaymentStats(req, res) {
  try {
    const [totalRevenue, paidCount, pendingCount, recentPurchases, planBreakdown] =
      await Promise.all([
        prisma.packagePurchase.aggregate({
          where: { status: "PAID" },
          _sum: { amount: true },
        }),
        prisma.packagePurchase.count({ where: { status: "PAID" } }),
        prisma.packagePurchase.count({ where: { status: "PENDING" } }),
        prisma.packagePurchase.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            User: { select: { email: true, fullName: true } },
            Company: { select: { name: true } },
          },
        }),
        prisma.company.groupBy({
          by: ["subscriptionPlan"],
          _count: { subscriptionPlan: true },
        }),
      ]);

    res.json({
      totalRevenue: totalRevenue._sum.amount ?? 0,
      paidCount,
      pendingCount,
      recentPurchases,
      planBreakdown: planBreakdown.map((row) => ({
        plan: row.subscriptionPlan,
        planLabel: getPlanLabel(row.subscriptionPlan),
        count: row._count.subscriptionPlan,
      })),
    });
  } catch (err) {
    console.error("Admin payment stats error:", err);
    res.status(500).json({ error: "Failed to load payment stats" });
  }
}