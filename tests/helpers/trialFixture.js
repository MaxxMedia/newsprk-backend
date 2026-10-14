import assert from "node:assert/strict";
export function trialFixture() {
  let state = {
    user: [{ id: 10, companyId: 20, fullName: "Owner", role: "recruiter", packageSelected: false }, { id: 11, companyId: 20, role: "recruiter" }],
    company: [{ id: 20, subscriptionPlan: "free", subscriptionExpiresAt: null, jobPostingCredits: 0 }],
    companyTrial: [], packagePurchase: [],
    job: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, companyId: 20, employmentType: i < 4 ? "Full-time" : "Internship", isExternal: false, isActive: true, createdAt: new Date(2026, 0, i + 1) })),
    supplierDirectory: [{ id: 1, companyId: 20, companyGallery: ["saved.png"], description: "saved" }],
    post: [{ id: 1, companyId: 20, createdById: 10, content: "saved article", createdAt: new Date() }],
    companyTeamMember: [{ id: 1, companyId: 20, status: "ACTIVE" }],
  };
  let queue = Promise.resolve(), failTable = null;
  const copy = value => structuredClone(value);
  function matches(row, where = {}) {
    return Object.entries(where).every(([key, value]) => {
      if (key === "OR") return value.some(part => matches(row, part));
      if (key === "AND") return value.every(part => matches(row, part));
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("not" in value) return row[key] !== value.not;
        if ("in" in value) return value.in.includes(row[key]);
        if ("notIn" in value) return !value.notIn.includes(row[key]);
        if ("gt" in value) return row[key] != null && row[key] > value.gt;
        if ("lte" in value) return row[key] != null && row[key] <= value.lte;
      }
      return row[key] === value;
    });
  }
  function client(getState) {
    const result = {};
    for (const table of Object.keys(state)) {
      function enrich(row, args = {}) {
        if (!row) return null;
        const value = copy(row), db = getState();
        if (table === "companyTrial" && args.include?.Purchase) value.Purchase = copy(db.packagePurchase.find(p => p.id === row.purchaseId));
        if (table === "post") {
          value.PackagePurchase = copy(db.packagePurchase.find(p => p.id === row.packagePurchaseId) ?? null);
          value.User_Post_createdByIdToUser = copy(db.user.find(u => u.id === row.createdById) ?? null);
        }
        if (table === "user" && args.select?.Company) value.Company = copy(db.company.find(c => c.id === row.companyId) ?? null);
        return value;
      }
      function update(row, data) {
        if (failTable === table) throw new Error("Simulated " + table + " failure");
        assert.ok(row);
        for (const [key, value] of Object.entries(data)) {
          if (value === undefined) continue;
          row[key] = value && typeof value === "object" && "increment" in value ? (row[key] || 0) + value.increment : copy(value);
        }
        return copy(row);
      }
      result[table] = {
        findUnique: async args => enrich(getState()[table].find(row => matches(row, args.where)), args),
        findFirst: async args => enrich(getState()[table].find(row => matches(row, args.where)), args),
        findMany: async (args = {}) => {
          let rows = getState()[table].filter(row => matches(row, args.where));
          const order = Array.isArray(args.orderBy) ? args.orderBy : args.orderBy ? [args.orderBy] : [];
          rows = [...rows].sort((a,b) => {
            for (const part of order) { const [key, dir] = Object.entries(part)[0]; if (a[key] > b[key]) return dir === "desc" ? -1 : 1; if (a[key] < b[key]) return dir === "desc" ? 1 : -1; }
            return 0;
          });
          if (args.take !== undefined) rows = rows.slice(0, args.take);
          return rows.map(row => enrich(row, args));
        },
        count: async ({ where } = {}) => getState()[table].filter(row => matches(row, where)).length,
        create: async ({ data }) => {
          if (failTable === table) throw new Error("Simulated create failure");
          if (table === "companyTrial") assert.ok(!getState()[table].some(row => row.companyId === data.companyId), "Unique company trial");
          const row = { id: Math.max(0, ...getState()[table].map(row => row.id || 0)) + 1, createdAt: new Date(), convertedAt: null, expiredAt: null, ...copy(data) };
          getState()[table].push(row);
          return copy(row);
        },
        update: async ({ where, data }) => update(getState()[table].find(row => matches(row, where)), data),
        updateMany: async ({ where, data }) => {
          const rows = getState()[table].filter(row => matches(row, where));
          for (const row of rows) update(row, data);
          return { count: rows.length };
        },
      };
    }
    return result;
  }
  const db = client(() => state);
  db.$transaction = callback => {
    const run = queue.then(async () => {
      const draft = copy(state);
      const value = await callback(client(() => draft));
      state = draft;
      return value;
    });
    queue = run.catch(() => {});
    return run;
  };
  return { db, get state() { return state; }, fail(table) { failTable = table; } };
}
