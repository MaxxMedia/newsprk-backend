import crypto from "node:crypto";
import { prisma } from "./prisma.js";
import { resolvePackage } from "./packagePricing.js";
import { getActiveSubscription, syncCompanySubscription } from "./packagePurchases.js";
import { enforceCompanyJobVisibility } from "./jobVisibility.js";
import { getCompanyTrialInfo, TRIAL_DAYS } from "./trialInfo.js";

function trialError(message, code, status = 409) {
  return Object.assign(new Error(message), { code, status });
}

export async function startCompanyTrial(userId, packageType, packageId, prismaClient = prisma, now = new Date()) {
  const resolved = await resolvePackage(packageType, packageId, { requireActive: true });
  if (!resolved || (resolved.packageType === "SUBSCRIPTION" && !["basic", "professional", "enterprise"].includes(resolved.packageId))) {
    throw trialError("Choose a paid package for your free trial.", "INVALID_TRIAL_PACKAGE", 400);
  }
  return prismaClient.$transaction(async (tx) => {
    // Lock the purchaser before creating a company, so concurrent callbacks
    // from a new account cannot create two companies and two trials.
    await tx.user.update({ where: { id: userId }, data: { packageSelected: true } });
    const user = await tx.user.findUnique({ where: { id: userId } });
    let companyId = user.companyId;
    if (!companyId) {
      const company = await tx.company.create({
        data: {
          name: (user.fullName || "User") + "'s Company",
          slug: "trial-" + userId + "-" + crypto.randomUUID().slice(0, 8),
        },
      });
      companyId = company.id;
      await tx.user.update({ where: { id: userId }, data: { companyId } });
    }

    // Updating the company acquires a row lock shared by all its team members.
    // Re-read the trial after the lock to enforce one window per company.
    await tx.company.update({ where: { id: companyId }, data: { jobPostingCredits: { increment: 0 } } });
    const trial = await tx.companyTrial.findUnique({
      where: { companyId },
      include: { Purchase: true },
    });
    let purchase;
    if (trial) {
      if (trial.convertedAt || trial.expiredAt || trial.expiresAt <= now) {
        throw trialError("Your company has already used its 30-day free trial. Choose a package to renew.", "TRIAL_ALREADY_USED");
      }
      if (trial.Purchase.packageType === resolved.packageType && trial.Purchase.packageId === resolved.packageId) {
        return { purchase: trial.Purchase, trial: await getCompanyTrialInfo(companyId, tx, now) };
      }
      await tx.packagePurchase.update({ where: { id: trial.purchaseId }, data: { expiresAt: now } });
      purchase = await tx.packagePurchase.create({
        data: { userId, companyId, packageType: resolved.packageType, packageId: resolved.packageId,
          packageName: resolved.packageName, amount: 0, status: "TRIAL", startsAt: now, expiresAt: trial.expiresAt,
          metadata: resolved.metadata ?? undefined },
      });
      await tx.companyTrial.update({ where: { companyId }, data: { purchaseId: purchase.id } });
    } else {
      const previous = await getActiveSubscription(companyId, tx, now);
      const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 86400000);
      purchase = await tx.packagePurchase.create({
        data: { userId, companyId, packageType: resolved.packageType, packageId: resolved.packageId,
          packageName: resolved.packageName, amount: 0, status: "TRIAL", startsAt: now, expiresAt,
          metadata: resolved.metadata ?? undefined },
      });
      await tx.companyTrial.create({
        data: { companyId, purchaseId: purchase.id, startsAt: now, expiresAt,
          previousSubscriptionPlan: previous.plan, previousSubscriptionExpiresAt: previous.expiresAt },
      });
    }
    await syncCompanySubscription(companyId, tx);
    await enforceCompanyJobVisibility(companyId, tx);
    return { purchase, trial: await getCompanyTrialInfo(companyId, tx, now) };
  }, { maxWait: 10000, timeout: 15000 });
}

export async function convertCompanyTrial(companyId, packageType, prismaClient, now = new Date()) {
  if (!companyId) return;
  await prismaClient.company.update({ where: { id: companyId }, data: { jobPostingCredits: { increment: 0 } } });
  const trial = await prismaClient.companyTrial.findUnique({
    where: { companyId },
    include: { Purchase: true },
  });
  if (!trial || trial.convertedAt || trial.expiredAt || trial.Purchase.packageType !== packageType) return;
  await prismaClient.packagePurchase.update({
    where: { id: trial.purchaseId },
    data: { expiresAt: trial.expiresAt < now ? trial.expiresAt : now },
  });
  await prismaClient.companyTrial.update({
    where: { companyId },
    data: { convertedAt: now },
  });
}

export async function expireCompanyTrials(prismaClient = prisma, now = new Date()) {
  const trials = await prismaClient.companyTrial.findMany({
    where: { expiresAt: { lte: now }, convertedAt: null, expiredAt: null },
    select: { companyId: true },
  });
  for (const trial of trials) {
    try {
      await prismaClient.$transaction(async (tx) => {
        await tx.company.update({ where: { id: trial.companyId }, data: { jobPostingCredits: { increment: 0 } } });
        const current = await tx.companyTrial.findUnique({ where: { companyId: trial.companyId } });
        if (!current || current.convertedAt || current.expiredAt || current.expiresAt > now) return;
        await syncCompanySubscription(trial.companyId, tx);
        await enforceCompanyJobVisibility(trial.companyId, tx);
        await tx.companyTrial.update({
          where: { companyId: trial.companyId },
          data: { expiredAt: now },
        });
      }, { maxWait: 10000, timeout: 15000 });
    } catch (err) {
      console.error("Trial expiry error for company " + trial.companyId + ":", err);
    }
  }
}

export function startTrialExpiryWorker() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try { await expireCompanyTrials(); }
    catch (err) { console.error("Trial expiry worker error:", err); }
    finally { running = false; }
  };
  void run();
  const timer = setInterval(run, 60000);
  timer.unref();
  return timer;
}
