import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import articlePrisma from "../src/prismaClient.js";
import { prisma as planPrisma } from "../src/lib/prisma.js";
import { createRecruiterArticle } from "../src/controllers/recruiterArticle.js";

let plan, approvedCount, companyId, writes, restorations;

function replaceMethod(delegate, name, implementation) {
  const original = delegate[name];
  delegate[name] = implementation;
  restorations.push(() => { delegate[name] = original; });
}

beforeEach(() => {
  plan = "enterprise";
  approvedCount = 0;
  companyId = 20;
  writes = [];
  restorations = [];
  replaceMethod(articlePrisma.user, "findUnique", async () => ({ companyId }));
  replaceMethod(articlePrisma.category, "findUnique", async ({ where }) => ({ id: 7, slug: where.slug }));
  replaceMethod(articlePrisma.post, "create", async ({ data }) => {
    writes.push(data);
    return { id: 100, ...data, category: { id: 7, slug: "machine" } };
  });
  replaceMethod(articlePrisma.post, "findMany", async () => {
    throw new Error("Creating an article must not scan saved articles for visibility");
  });
  replaceMethod(planPrisma.packagePurchase, "findMany", async () => []);
  replaceMethod(planPrisma.company, "findUnique", async () => ({ subscriptionPlan: plan, subscriptionExpiresAt: null }));
  replaceMethod(planPrisma.companyTrial, "findUnique", async () => null);
  replaceMethod(planPrisma.post, "count", async () => approvedCount);
});

afterEach(() => { restorations.reverse().forEach(restore => restore()); });

function request(body = {}) {
  return {
    user: { id: 10, role: "recruiter", companyId: 20 },
    body: { title: "Submission regression article", content: "Original test content.", categorySlug: "machine", ...body },
  };
}

function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("eligible recruiter submission creates an unpublished article pending admin approval", async () => {
  const res = response();
  await createRecruiterArticle(request(), res);
  assert.equal(res.statusCode, 201);
  assert.equal(writes.length, 1);
  assert.equal(res.body.status, "PENDING");
  assert.equal(res.body.publishedAt, null);
  assert.equal(res.body.createdById, 10);
  assert.equal(res.body.companyId, 20);
  assert.equal(res.body.categoryId, 7);
});

test("the Free plan rejects article submission without creating a post", async () => {
  plan = "free";
  const res = response();
  await createRecruiterArticle(request(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "ARTICLE_LIMIT_REACHED");
  assert.equal(writes.length, 0);
});

test("a paid plan at its annual article limit rejects submission without creating a post", async () => {
  plan = "basic";
  approvedCount = 4;
  const res = response();
  await createRecruiterArticle(request(), res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, "ARTICLE_LIMIT_REACHED");
  assert.equal(writes.length, 0);
});

test("invalid categories reject submission without creating a post", async () => {
  const res = response();
  await createRecruiterArticle(request({ categorySlug: "events" }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Invalid topic category");
  assert.equal(writes.length, 0);
});

test("missing required article content rejects submission without creating a post", async () => {
  const res = response();
  await createRecruiterArticle(request({ content: "" }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "Title and content are required");
  assert.equal(writes.length, 0);
});
