import assert from "node:assert/strict";
import crypto from "node:crypto";
import { beforeEach, afterEach, mock, test } from "node:test";
import { prisma } from "../src/lib/prisma.js";
import { trialFixture } from "./helpers/trialFixture.js";
import { startCompanyTrial, expireCompanyTrials } from "../src/lib/companyTrials.js";
import { getCompanyTrialInfo } from "../src/lib/trialInfo.js";
import { getActiveSubscription } from "../src/lib/packagePurchases.js";
import { addonPurchaseHasAccess, limitCompanyRows, hiddenDirectoryIds, hiddenPostIds } from "../src/lib/companyPlanVisibility.js";
import { activateTrial } from "../src/controllers/trialsController.js";
import { verifyPayment, activateFreePlan } from "../src/controllers/paymentsController.js";

let fixture, restore;
const now = Date.parse("2026-10-13T12:00:00Z");
beforeEach(() => {
  mock.timers.enable({ apis: ["Date"], now });
  fixture = trialFixture();
  restore = [];
  const replace = (obj, key, value) => { const old = obj[key]; obj[key] = value; restore.push(() => { obj[key] = old; }); };
  replace(prisma.package, "findUnique", async () => null);
  for (const [table, delegate] of Object.entries(fixture.db)) {
    if (table === "$transaction") replace(prisma, table, delegate);
    else for (const [method, fn] of Object.entries(delegate)) replace(prisma[table], method, fn);
  }
});
afterEach(() => { restore.reverse().forEach(fn => fn()); mock.restoreAll(); mock.timers.reset(); });
const start = (type = "SUBSCRIPTION", id = "professional", userId = 10) => startCompanyTrial(userId, type, id, fixture.db);
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

for (const [type, id] of [["SUBSCRIPTION", "basic"], ["SUBSCRIPTION", "professional"], ["SUBSCRIPTION", "enterprise"], ["BANNER", "homepage-hero:annual"], ["SPONSORED", "gold"], ["RECRUITMENT", "single-job"]]) {
  test(type + " " + id + " receives exactly 30 days without a Razorpay order", async () => {
    const result = await start(type, id);
    assert.equal(result.purchase.status, "TRIAL");
    assert.equal(result.purchase.amount, 0);
    assert.equal(result.purchase.razorpayOrderId, undefined);
    assert.equal(result.purchase.expiresAt - result.purchase.startsAt, 30 * 86400000);
    assert.equal(result.trial.eligible, false);
    assert.equal(result.trial.daysRemaining, 30);
  });
}
test("company members share one trial; repeated requests keep the same purchase", async () => {
  const [a,b] = await Promise.all([start(), start("SUBSCRIPTION", "professional", 11)]);
  assert.equal(a.purchase.id, b.purchase.id);
  assert.equal(fixture.state.companyTrial.length, 1);
  assert.equal(fixture.state.packagePurchase.length, 1);
});
test("a new company is created once for concurrent requests from a new account", async () => {
  fixture.state.user[0].companyId = null;
  await Promise.all([start(), start()]);
  assert.equal(fixture.state.company.length, 2);
  assert.equal(fixture.state.companyTrial.length, 1);
  assert.ok(fixture.state.user[0].companyId);
});
test("switching tiers and package categories keeps the original company expiry", async () => {
  const first = await start();
  mock.timers.setTime(now + 10 * 86400000);
  const switched = await start("BANNER", "homepage-sidebar:monthly", 11);
  assert.deepEqual(switched.trial.expiresAt, first.trial.expiresAt);
  assert.equal(switched.trial.daysRemaining, 20);
  assert.equal(fixture.state.company[0].subscriptionPlan, "free");
  assert.equal(fixture.state.packagePurchase[0].expiresAt.getTime(), Date.now());
  assert.equal(await addonPurchaseHasAccess(first.purchase, fixture.db), false);
});
test("expiry applies on reads at the exact boundary before the worker runs", async () => {
  const { trial } = await start();
  mock.timers.setTime(trial.expiresAt.getTime() - 1);
  assert.equal((await getActiveSubscription(20, fixture.db)).plan, "professional");
  mock.timers.setTime(trial.expiresAt.getTime());
  assert.equal((await getActiveSubscription(20, fixture.db)).plan, "free");
  assert.equal((await getCompanyTrialInfo(20, fixture.db)).status, "EXPIRED");
  await assert.rejects(start("SUBSCRIPTION", "enterprise", 11), { code: "TRIAL_ALREADY_USED" });
});
test("expiry hides premium records and internships without deleting stored data", async () => {
  const before = structuredClone({ dirs: fixture.state.supplierDirectory, posts: fixture.state.post, members: fixture.state.companyTeamMember });
  const { trial } = await start();
  mock.timers.setTime(trial.expiresAt.getTime());
  await expireCompanyTrials(fixture.db);
  assert.equal(fixture.state.job.filter(row => row.isActive).length, 2);
  assert.ok(fixture.state.job.filter(row => row.employmentType === "Internship").every(row => !row.isActive));
  assert.equal(fixture.state.job.length, 6);
  assert.equal((await limitCompanyRows(fixture.state.post, 20, "articles", fixture.db)).length, 0);
  assert.equal((await limitCompanyRows(fixture.state.companyTeamMember, 20, "team", fixture.db)).length, 0);
  assert.deepEqual({ dirs: fixture.state.supplierDirectory, posts: fixture.state.post, members: fixture.state.companyTeamMember }, before);
});
test("active paid benefits survive a trial expiry", async () => {
  fixture.state.packagePurchase.push({ id: 50, companyId: 20, packageType: "SUBSCRIPTION", packageId: "basic", status: "PAID", expiresAt: new Date("2027-10-13"), createdAt: new Date() });
  const { trial } = await start();
  mock.timers.setTime(trial.expiresAt.getTime());
  await expireCompanyTrials(fixture.db);
  assert.equal(fixture.state.company[0].subscriptionPlan, "basic");
  assert.equal(fixture.state.job.filter(row => row.isActive).length, 6);
});
test("legacy paid company without purchase rows retains its original subscription", async () => {
  fixture.state.company[0].subscriptionPlan = "basic";
  fixture.state.company[0].subscriptionExpiresAt = new Date("2027-01-01");
  const { trial } = await start();
  await start("BANNER", "homepage-hero:annual");
  assert.equal((await getActiveSubscription(20, fixture.db)).plan, "basic");
  mock.timers.setTime(trial.expiresAt.getTime());
  await expireCompanyTrials(fixture.db);
  assert.equal(fixture.state.company[0].subscriptionPlan, "basic");
});
test("signed renewal ends the trial and preserves the paid duration on retry", async () => {
  const { trial } = await start();
  fixture.state.packagePurchase.push({ id: 70, companyId: 20, userId: 10, packageType: "SUBSCRIPTION", packageId: "professional", status: "PENDING", razorpayOrderId: "order_renew", createdAt: new Date() });
  const oldSecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = "trial-test-secret";
  const req = { user: { id: 10, role: "recruiter" }, body: { razorpay_order_id: "order_renew", razorpay_payment_id: "pay_renew", razorpay_signature: crypto.createHmac("sha256", "trial-test-secret").update("order_renew|pay_renew").digest("hex") } };
  try {
    const res = response(); await verifyPayment(req, res);
    assert.equal(res.body.success, true);
    const paid = fixture.state.packagePurchase.find(row => row.id === 70);
    assert.equal(paid.expiresAt - paid.startsAt, 365 * 86400000);
    assert.equal((await getCompanyTrialInfo(20, fixture.db)).status, "CONVERTED");
    mock.timers.setTime(trial.expiresAt.getTime());
    await expireCompanyTrials(fixture.db);
    assert.equal((await getActiveSubscription(20, fixture.db)).plan, "professional");
    const originalExpiry = paid.expiresAt;
    await verifyPayment(req, response());
    assert.deepEqual(fixture.state.packagePurchase.find(row => row.id === 70).expiresAt, originalExpiry);
    await assert.rejects(start(), { code: "TRIAL_ALREADY_USED" });
  } finally { if (oldSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET; else process.env.RAZORPAY_KEY_SECRET = oldSecret; }
});
test("selecting Free ends the trial without resetting company eligibility", async () => {
  await start();
  const res = response(); await activateFreePlan({ user: { id: 10, role: "recruiter" } }, res);
  assert.equal(res.body.success, true);
  assert.equal((await getActiveSubscription(20, fixture.db)).plan, "free");
  await assert.rejects(start(), { code: "TRIAL_ALREADY_USED" });
});
test("activation failure rolls back trial consumption and can be retried", async () => {
  const before = structuredClone(fixture.state);
  fixture.fail("job");
  await assert.rejects(start());
  assert.deepEqual(fixture.state, before);
  fixture.fail(null);
  assert.equal((await start()).trial.status, "ACTIVE");
});
test("Free, invalid packages and non-company accounts cannot consume a trial", async () => {
  await assert.rejects(start("SUBSCRIPTION", "free"), { code: "INVALID_TRIAL_PACKAGE" });
  await assert.rejects(start("BANNER", "unknown:monthly"), { code: "INVALID_TRIAL_PACKAGE" });
  const res = response();
  await activateTrial({ user: { id: 10, role: "jobseeker" }, body: { packageType: "SUBSCRIPTION", packageId: "enterprise" } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(fixture.state.companyTrial.length, 0);
});
test("company directory quota hides excess rows and renewal restores them", async () => {
  fixture.state.supplierDirectory = Array.from({ length: 8 }, (_, i) => ({ id: i+1, companyId: 20, createdAt: new Date(2026,0,i+1) }));
  await start();
  assert.equal((await hiddenDirectoryIds(fixture.db)).length, 0);
  mock.timers.setTime(fixture.state.companyTrial[0].expiresAt.getTime());
  assert.equal((await hiddenDirectoryIds(fixture.db)).length, 3);
  fixture.state.packagePurchase.push({ id: 90, companyId: 20, packageType: "SUBSCRIPTION", packageId: "basic", status: "PAID", expiresAt: new Date("2027-01-01") });
  assert.equal((await hiddenDirectoryIds(fixture.db)).length, 0);
  assert.equal(fixture.state.supplierDirectory.length, 8);
});
test("package-linked sponsored content hides at expiry and returns after payment", async () => {
  const { purchase } = await start("SPONSORED", "gold");
  fixture.state.post.push({ id: 2, companyId: 20, packagePurchaseId: purchase.id, content: "sponsored saved content", createdAt: new Date() });
  assert.equal((await hiddenPostIds(fixture.db)).includes(2), false);
  mock.timers.setTime(purchase.expiresAt.getTime());
  assert.equal((await hiddenPostIds(fixture.db)).includes(2), true);
  fixture.state.packagePurchase.push({ id: 95, companyId: 20, packageType: "SPONSORED", packageId: "gold", status: "PAID", expiresAt: null });
  assert.equal((await hiddenPostIds(fixture.db)).includes(2), false);
  assert.equal(fixture.state.post[1].content, "sponsored saved content");
});

test("trial expiry and renewal leave manually closed jobs closed", async () => {
  fixture.state.job[0].isActive = false;
  fixture.state.job[0].hiddenByPlan = false;
  const { trial } = await start();
  assert.equal(fixture.state.job[0].isActive, false);
  mock.timers.setTime(trial.expiresAt.getTime());
  await expireCompanyTrials(fixture.db);
  assert.equal(fixture.state.job[0].isActive, false);
  assert.equal(fixture.state.job[0].hiddenByPlan, false);
});
test("a banner renewal with a different billing duration restores the same placement", async () => {
  const { purchase } = await start("BANNER", "homepage-hero:annual");
  mock.timers.setTime(purchase.expiresAt.getTime());
  assert.equal(await addonPurchaseHasAccess(purchase, fixture.db), false);
  fixture.state.packagePurchase.push({ id: 100, companyId: 20, packageType: "BANNER", packageId: "homepage-hero:monthly", status: "PAID", expiresAt: new Date(Date.now() + 30 * 86400000) });
  assert.equal(await addonPurchaseHasAccess(purchase, fixture.db), true);
});

test("disabled packages cannot start trials and do not consume company eligibility", async () => {
  prisma.package.findUnique = async () => ({ id: "enterprise", isActive: false });
  await assert.rejects(start("SUBSCRIPTION", "enterprise"), { code: "PACKAGE_UNAVAILABLE" });
  assert.equal(fixture.state.companyTrial.length, 0);
});

test("paid article allowances preserve previous years' content", async () => {
  fixture.state.company[0].subscriptionPlan = "basic";
  fixture.state.company[0].subscriptionExpiresAt = new Date("2027-01-01");
  fixture.state.post = [2025, 2026].flatMap(year => Array.from({ length: 4 }, (_, index) => ({ id: year * 10 + index, companyId: 20, createdById: 10, createdAt: new Date(year + "-01-01T00:00:00Z") })));
  assert.deepEqual(await hiddenPostIds(fixture.db), []);
});

test("a same-tier trial cannot shorten an existing paid subscription expiry", async () => {
  const paidExpiry = new Date("2027-10-13T12:00:00Z");
  fixture.state.packagePurchase.push({ id: 50, companyId: 20, packageType: "SUBSCRIPTION", packageId: "professional", status: "PAID", expiresAt: paidExpiry, createdAt: new Date("2026-01-01") });
  await start();
  const active = await getActiveSubscription(20, fixture.db);
  assert.deepEqual(active.expiresAt, paidExpiry);
  assert.equal(active.purchase.status, "PAID");
  assert.deepEqual(fixture.state.company[0].subscriptionExpiresAt, paidExpiry);
});
test("a legacy paid subscription without an expiry keeps that benefit during a same-tier trial", async () => {
  fixture.state.company[0].subscriptionPlan = "basic";
  fixture.state.company[0].subscriptionExpiresAt = null;
  await start("SUBSCRIPTION", "basic");
  assert.equal((await getActiveSubscription(20, fixture.db)).expiresAt, null);
  assert.equal(fixture.state.company[0].subscriptionExpiresAt, null);
});
