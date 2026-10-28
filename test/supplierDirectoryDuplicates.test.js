import test from "node:test";
import assert from "node:assert/strict";
import xlsx from "xlsx";
import prisma from "../src/prismaClient.js";
import { withUniqueSupplierDirectoryName } from "../src/lib/supplierDirectoryUniqueness.js";
import { bulkCreateFullSetup } from "../src/controllers/adminBulkController.js";
import {
  adminCreateDirectory,
  adminCreateFullSetup,
  adminUpdateDirectory,
} from "../src/controllers/adminDirectoryController.js";

// These tests use an in-memory transaction double and never connect to a database.
function database(initial = {}) {
  const state = {
    directories: structuredClone(initial.directories || []),
    users: structuredClone(initial.users || []),
    companies: [],
    audits: [],
  };
  const db = {
    state,
    async $queryRaw(strings, name, excludeId) {
      assert.ok(strings.join("?").includes('lower(btrim("name"))'));
      return state.directories
        .filter(row => row.name.trim().toLowerCase() === name.toLowerCase() && row.id !== excludeId)
        .slice(0, 1)
        .map(({ id }) => ({ id }));
    },
    async $transaction(write, options) {
      assert.equal(options.isolationLevel, "Serializable");
      const before = structuredClone(state);
      try {
        return await write(db);
      } catch (error) {
        Object.assign(state, before);
        throw error;
      }
    },
    company: {
      async create({ data }) {
        const row = { id: state.companies.length + 1, ...data };
        state.companies.push(row);
        return row;
      },
      async findUnique() { return null; },
      async update({ data }) { return data; },
    },
    user: {
      async findUnique({ where }) {
        return state.users.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) || null;
      },
      async create({ data }) {
        const row = { id: state.users.length + 1, ...data };
        state.users.push(row);
        return row;
      },
    },
    industry: {
      async findUnique() { return { id: 1, name: "Engineering" }; },
      async findFirst() { return { id: 1, name: "Engineering" }; },
    },
    supplierDirectory: {
      async create({ data }) {
        const row = { id: state.directories.length + 1, ...data };
        state.directories.push(row);
        return row;
      },
      async findUnique({ where }) {
        return state.directories.find(row => Object.entries(where).every(([key, value]) => row[key] === value)) || null;
      },
      async update({ where, data }) {
        const row = state.directories.find(row => row.id === where.id);
        assert.ok(row);
        Object.assign(row, data);
        return row;
      },
    },
    auditLog: {
      async create({ data }) { state.audits.push(data); return data; },
    },
  };
  return db;
}

function mockPrisma(t, db) {
  // Prisma exposes methods through proxies with empty property descriptors.
  // Replace client properties directly and restore them after each test.
  for (const model of ["$transaction", "user", "supplierDirectory", "company", "auditLog"]) {
    const original = prisma[model];
    prisma[model] = db[model];
    t.after(() => { prisma[model] = original; });
  }
  t.mock.method(console, "error", () => {});
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function upload(rows, role) {
  const sheet = xlsx.utils.json_to_sheet(rows);
  const book = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book, sheet, "Suppliers");
  return {
    user: { id: 99, role },
    file: { buffer: xlsx.write(book, { type: "buffer", bookType: "xlsx" }) },
  };
}

for (const role of ["admin", "sub_admin", "super_admin"]) {
  test(role + ": Excel skips company names or emails independently and continues", async t => {
    const db = database({
      directories: [
        { id: 1, name: " Taken Ltd ", status: "APPROVED" },
        { id: 2, name: "Pending Ltd", status: "PENDING" },
        { id: 3, name: "Rejected Ltd", status: "REJECTED" },
      ],
      users: [{ id: 1, email: "used@example.com" }],
    });
    mockPrisma(t, db);
    const rows = [
      { companyName: "taken LTD", email: "new1@example.com", industryPath: "Engineering" },
      { companyName: "pending LTD", email: "new2@example.com", industryPath: "Engineering" },
      { companyName: "rejected LTD", email: "new3@example.com", industryPath: "Engineering" },
      { companyName: " Fresh Ltd ", email: "fresh@example.com", industryPath: "Engineering" },
      { companyName: "FRESH LTD", email: "other@example.com", industryPath: "Engineering" },
      { companyName: "Other Ltd", email: "used@example.com", industryPath: "Engineering" },
      { companyName: "Invalid Ltd", email: "invalid@example.com" },
      { companyName: "Different Ltd", email: "different@example.com", industryPath: "Engineering" },
    ];
    const res = response();
    await bulkCreateFullSetup(upload(rows, role), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.total, 8);
    assert.equal(res.body.successCount, 2);
    assert.equal(res.body.skippedCount, 5);
    assert.equal(res.body.failedCount, 1);
    assert.deepEqual(res.body.skipped.map(row => row.row), [2, 3, 4, 6, 7]);
    assert.match(res.body.skipped[0].reason, /company name already exists/);
    assert.match(res.body.skipped[4].reason, /Email already exists/);
    assert.deepEqual(db.state.companies.map(row => row.name), ["Fresh Ltd", "Different Ltd"]);
    assert.equal(db.state.users.length, 3);
    assert.equal(db.state.directories.length, 5);
    assert.equal(db.state.directories[3].approvedById, 99);
  });

  test(role + ": manual creation rejects duplicate company names", async t => {
    const db = database({ directories: [{ id: 1, name: "Existing Ltd" }] });
    mockPrisma(t, db);
    const request = {
      user: { id: 99, role },
      body: { name: " EXISTING LTD ", slug: "another-slug", description: "Supplier", companyId: 1, submittedById: 1 },
    };
    const rejected = response();
    await adminCreateDirectory(request, rejected);
    assert.equal(rejected.statusCode, 409);
    assert.equal(db.state.directories.length, 1);

    request.body.name = " New Ltd ";
    const created = response();
    await adminCreateDirectory(request, created);
    assert.equal(created.statusCode, 201);
    assert.equal(created.body.name, "New Ltd");
  });

  test(role + ": full setup checks both company and directory names before writing", async t => {
    const db = database({ directories: [{ id: 1, name: "Existing Ltd" }] });
    mockPrisma(t, db);
    const request = {
      user: { id: 99, role },
      body: {
        company: { name: " EXISTING LTD ", industryId: 1 },
        recruiter: { email: "new@example.com", password: "Test-password-123" },
        directory: { name: "Alternative name", description: "Supplier" },
      },
    };
    const rejected = response();
    await adminCreateFullSetup(request, rejected);
    assert.equal(rejected.statusCode, 409);
    assert.equal(db.state.companies.length, 0);
    assert.equal(db.state.users.length, 0);

    request.body.company.name = "Fresh Company";
    request.body.directory.name = "existing ltd";
    const rejectedDirectory = response();
    await adminCreateFullSetup(request, rejectedDirectory);
    assert.equal(rejectedDirectory.statusCode, 409);
    assert.equal(db.state.companies.length, 0);

    request.body.directory.name = " Fresh Company ";
    const created = response();
    await adminCreateFullSetup(request, created);
    assert.equal(created.statusCode, 201);
    assert.equal(created.body.directory.name, "Fresh Company");
  });

  test(role + ": editing keeps its own name and rejects another directory's name", async t => {
    const db = database({
      directories: [
        { id: 1, name: "First Ltd" },
        { id: 2, name: "Second Ltd" },
      ],
    });
    mockPrisma(t, db);
    const request = { user: { id: 99, role }, params: { id: "1" }, body: { name: " second LTD " } };
    const rejected = response();
    await adminUpdateDirectory(request, rejected);
    assert.equal(rejected.statusCode, 409);
    assert.equal(db.state.directories[0].name, "First Ltd");

    request.body.name = " FIRST LTD ";
    const updated = response();
    await adminUpdateDirectory(request, updated);
    assert.equal(updated.statusCode, 200);
    assert.equal(db.state.directories[0].name, "FIRST LTD");

    request.body = { description: "Updated description" };
    const unchangedName = response();
    await adminUpdateDirectory(request, unchangedName);
    assert.equal(unchangedName.statusCode, 200);
  });
}

test("a failed row rolls back the company and recruiter", async t => {
  const db = database();
  db.supplierDirectory.create = async () => { throw new Error("Database write failed"); };
  mockPrisma(t, db);
  const res = response();
  await bulkCreateFullSetup(upload([
    { companyName: "Rollback Ltd", email: "rollback@example.com", industryPath: "Engineering" },
  ], "admin"), res);
  assert.equal(res.body.failedCount, 1);
  assert.equal(db.state.companies.length, 0);
  assert.equal(db.state.users.length, 0);
  assert.equal(db.state.directories.length, 0);
});

test("serialization conflicts retry and recheck the company name", async () => {
  const db = database();
  let attempts = 0;
  let writes = 0;
  const transaction = db.$transaction;
  db.$transaction = async (write, options) => {
    attempts++;
    if (attempts === 1) {
      db.state.directories.push({ id: 1, name: "Concurrent Ltd" });
      throw Object.assign(new Error("Write conflict"), { code: "P2034" });
    }
    return transaction(write, options);
  };
  await assert.rejects(
    withUniqueSupplierDirectoryName(db, "Concurrent Ltd", () => { writes++; }),
    { status: 409, code: "SUPPLIER_DIRECTORY_NAME_EXISTS" },
  );
  assert.equal(attempts, 2);
  assert.equal(writes, 0);
});

test("serialization retries are bounded", async () => {
  let attempts = 0;
  const db = {
    async $transaction() {
      attempts++;
      throw Object.assign(new Error("Write conflict"), { code: "P2034" });
    },
  };
  await assert.rejects(withUniqueSupplierDirectoryName(db, "Company", () => {}), { code: "P2034" });
  assert.equal(attempts, 3);
});

test("blank names are rejected before opening a transaction", async () => {
  await assert.rejects(withUniqueSupplierDirectoryName({}, "  ", () => {}), { status: 400 });
});

test("recruiters cannot use the staff upload endpoint", async () => {
  const res = response();
  await bulkCreateFullSetup(upload([], "recruiter"), res);
  assert.equal(res.statusCode, 403);
});
