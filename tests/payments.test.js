import assert from "node:assert/strict";
import crypto from "node:crypto";
import { beforeEach, afterEach, mock, test } from "node:test";
import { prisma } from "../src/lib/prisma.js";
import { verifyPayment } from "../src/controllers/paymentsController.js";

const secret = "payment-regression-test-secret";
const originalSecret = process.env.RAZORPAY_KEY_SECRET;
let state;
let failure;
let transactionCount;
let transactionQueue;
const restorations = [];

// Prisma delegates expose methods through proxies, so install stubs directly.
function replaceMethod(object, name, implementation) {
  const original = object[name];
  object[name] = implementation;
  restorations.push(() => { object[name] = original; });
}

function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return value.some((entry) => matches(row, entry));
    if (value && typeof value === "object") {
      if ("not" in value) return row[key] !== value.not;
      if ("gt" in value) return row[key] != null && row[key] > value.gt;
      if ("in" in value) return value.in.includes(row[key]);
    }
    return row[key] === value;
  });
}

function transactionClient(draft) {
  function update(table, where, data) {
    if (failure === table) throw new Error("Simulated database failure");
    const row = draft[table].find((entry) => matches(entry, where));
    assert.ok(row, "Fixture row must exist");
    for (const [key, value] of Object.entries(data)) {
      row[key] = value && typeof value === "object" && "increment" in value ? (row[key] || 0) + value.increment : value;
    }
    return structuredClone(row);
  }
  return {
    companyTrial: { findUnique: async () => null },
    packagePurchase: {
      findUnique: async ({ where }) => structuredClone(draft.purchases.find((row) => matches(row, where)) ?? null),
      findMany: async ({ where }) => structuredClone(draft.purchases.filter((row) => matches(row, where))),
      findFirst: async ({ where }) => structuredClone(draft.purchases.find((row) => matches(row, where)) ?? null),
      update: async ({ where, data }) => update("purchases", where, data),
      updateMany: async ({ where, data }) => {
        const rows = draft.purchases.filter((row) => matches(row, where));
        for (const row of rows) update("purchases", { id: row.id }, data);
        return { count: rows.length };
      },
    },
    user: {
      findUnique: async ({ where }) => structuredClone(draft.users.find((row) => matches(row, where)) ?? null),
      update: async ({ where, data }) => update("users", where, data),
    },
    company: {
      findUnique: async ({ where }) => structuredClone(draft.companies.find((row) => matches(row, where)) ?? null),
      update: async ({ where, data }) => update("companies", where, data),
    },
    job: {
      count: async ({ where }) => draft.jobs.filter((row) => matches(row, where)).length,
      findMany: async ({ where }) => structuredClone(draft.jobs.filter((row) => matches(row, where))),
      updateMany: async ({ where, data }) => {
        const rows = draft.jobs.filter((row) => matches(row, where));
        for (const row of rows) update("jobs", { id: row.id }, data);
        return { count: rows.length };
      },
    },
  };
}

beforeEach(() => {
  process.env.RAZORPAY_KEY_SECRET = secret;
  failure = null;
  transactionCount = 0;
  transactionQueue = Promise.resolve();
  state = {
    purchases: [{ id: 1, userId: 10, companyId: 20, packageType: "SUBSCRIPTION", packageId: "basic", status: "PENDING", razorpayOrderId: "order_test", startsAt: null, expiresAt: null }],
    users: [{ id: 10, companyId: 20, packageSelected: false }],
    companies: [{ id: 20, subscriptionPlan: "free", subscriptionExpiresAt: null, jobPostingCredits: 0 }],
    jobs: Array.from({ length: 21 }, (_, index) => ({ id: index + 1, companyId: 20, isExternal: false, isActive: false, hiddenByPlan: true, employmentType: "Full-time" })),
  };
  replaceMethod(prisma.package, "findUnique", async () => null);
  replaceMethod(prisma.packagePurchase, "findUnique", async ({ where }) => structuredClone(state.purchases.find((row) => matches(row, where)) ?? null));
  // All activation operations must use the transaction client, never the root.
  for (const [delegate, methods] of Object.entries({ company: ["findUnique", "update"], user: ["findUnique", "update"], job: ["count", "findMany", "updateMany"], packagePurchase: ["update", "updateMany", "findMany", "findFirst"] })) {
    for (const method of methods) replaceMethod(prisma[delegate], method, async () => { throw new Error("Activation escaped its transaction"); });
  }
  replaceMethod(prisma, "$transaction", (callback) => {
    transactionCount += 1;
    const run = transactionQueue.then(async () => {
      const draft = structuredClone(state);
      const result = await callback(transactionClient(draft));
      state = draft;
      return result;
    });
    transactionQueue = run.catch(() => {});
    return run;
  });
  mock.method(console, "error", () => {});
});

afterEach(() => {
  for (const restore of restorations.splice(0).reverse()) restore();
  mock.restoreAll();
  if (originalSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
  else process.env.RAZORPAY_KEY_SECRET = originalSecret;
});

async function verify({ userId = 10, role = "recruiter", signature, paymentId = "pay_test", orderId = "order_test" } = {}) {
  const body = {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature ?? crypto.createHmac("sha256", secret).update(orderId + "|" + paymentId).digest("hex"),
  };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  await verifyPayment({ body, user: { id: userId, role } }, res);
  return res;
}

test("signed payment commits the purchase, subscription, user flag and job visibility", async () => {
  const res = await verify();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(state.purchases[0].status, "PAID");
  assert.equal(state.purchases[0].razorpayPaymentId, "pay_test");
  assert.equal(state.users[0].packageSelected, true);
  assert.equal(state.companies[0].subscriptionPlan, "basic");
  assert.deepEqual(state.companies[0].subscriptionExpiresAt, state.purchases[0].expiresAt);
  assert.ok(state.purchases[0].expiresAt > state.purchases[0].startsAt);
  assert.equal(state.jobs.filter((job) => job.isActive).length, 20);
});

test("repeated callback succeeds without extending the original activation dates", async () => {
  await verify();
  const paid = structuredClone(state);
  const res = await verify();
  assert.equal(res.body.success, true);
  assert.deepEqual(state, paid);
  assert.equal(transactionCount, 1);
});

test("concurrent callbacks activate the same order once", async () => {
  const responses = await Promise.all([verify(), verify()]);
  assert.ok(responses.every((res) => res.statusCode === 200 && res.body.success));
  assert.deepEqual(responses[0].body.purchase.startsAt, responses[1].body.purchase.startsAt);
  assert.equal(state.purchases.filter((purchase) => purchase.status === "PAID").length, 1);
});

for (const table of ["users", "companies", "jobs"]) {
  test("failure updating " + table + " rolls back activation and permits a safe retry", async () => {
    const before = structuredClone(state);
    failure = table;
    const failed = await verify();
    assert.equal(failed.statusCode, 500);
    assert.deepEqual(state, before);
    failure = null;
    assert.equal((await verify()).body.success, true);
    assert.equal(state.purchases[0].status, "PAID");
  });
}

test("purchase without a company uses the user's newly linked company", async () => {
  state.purchases[0].companyId = null;
  assert.equal((await verify()).body.success, true);
  assert.equal(state.purchases[0].companyId, 20);
  assert.equal(state.companies[0].subscriptionPlan, "basic");
});

test("purchase without a company still records its duration and payment", async () => {
  state.purchases[0].companyId = null;
  state.users[0].companyId = null;
  assert.equal((await verify()).body.success, true);
  assert.equal(state.purchases[0].status, "PAID");
  assert.ok(state.purchases[0].expiresAt instanceof Date);
  assert.equal(state.users[0].packageSelected, true);
});

test("existing higher subscription tier remains active after a lower plan purchase", async () => {
  state.purchases.push({ ...state.purchases[0], id: 2, packageId: "enterprise", status: "PAID", razorpayOrderId: "order_previous", expiresAt: new Date("2099-01-01") });
  assert.equal((await verify()).body.success, true);
  assert.equal(state.companies[0].subscriptionPlan, "enterprise");
  assert.equal(state.jobs.filter((job) => job.isActive).length, 21);
});

test("recruitment slot is visible immediately after its payment", async () => {
  state.purchases[0].packageType = "RECRUITMENT";
  state.purchases[0].packageId = "single-job";
  assert.equal((await verify()).body.success, true);
  assert.equal(state.companies[0].subscriptionPlan, "free");
  assert.equal(state.jobs.filter((job) => job.isActive).length, 3);
});

test("invalid signature cannot activate a plan", async () => {
  const before = structuredClone(state);
  assert.equal((await verify({ signature: "invalid" })).statusCode, 400);
  assert.deepEqual(state, before);
  assert.equal(transactionCount, 0);
});

test("another user cannot activate the purchase", async () => {
  assert.equal((await verify({ userId: 11 })).statusCode, 403);
  assert.equal(transactionCount, 0);
});

test("missing purchase returns 404 without database changes", async () => {
  assert.equal((await verify({ orderId: "order_unknown" })).statusCode, 404);
  assert.equal(transactionCount, 0);
});

test("admin can verify a purchase and updates the purchasing user", async () => {
  assert.equal((await verify({ userId: 11, role: "admin" })).body.success, true);
  assert.equal(state.users[0].packageSelected, true);
});

test("renewal uses the duration saved at order creation", async () => {
  state.purchases[0].metadata = { durationDays: 90 };
  assert.equal((await verify()).body.success, true);
  assert.equal(state.purchases[0].expiresAt - state.purchases[0].startsAt, 90 * 86400000);
});
test("an existing signed order can be verified after its catalog package is disabled", async () => {
  state.purchases[0].metadata = { durationDays: 365 };
  prisma.package.findUnique = async () => ({ id: "basic", isActive: false });
  assert.equal((await verify()).body.success, true);
  assert.equal(state.purchases[0].status, "PAID");
});
