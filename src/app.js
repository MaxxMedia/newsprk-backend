import "./loadEnv.js"; // ✅ MUST be the very first import — loads .env
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import postsRoutes from "./routes/posts.js";
import authorsRoutes from "./routes/authors.js";
import categoriesRoutes from "./routes/categories.js";
import commentsRoutes from "./routes/comments.js";
import authRoutes from "./routes/auth.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import jobsRoutes from "./routes/jobs.js";
import companiesRoutes from "./routes/companies.js";
import adminCompaniesRoutes from "./routes/Admincompanies.js";
import applicationsRoutes from "./routes/applications.js";
import recruitersRoutes from "./routes/recruiters.js";
import candidatesRoutes from "./routes/candidates.js";
import recruiterDashboardRoutes from "./routes/recruiterDashboard.js";
import supplierDirectoryRoutes from "./routes/supplierDirectories.js";
import adminDirectoryRoutes from "./routes/adminDirectories.js";
import recruiterArticlesRoutes from "./routes/recruiterArticles.js";
import companyArticlesRoutes from "./routes/companyArticles.js";
import adminArticlesRoutes from "./routes/adminArticles.js";
import bannerRoutes from "./routes/banner.routes.js";
import bannerUploadRoutes from "./routes/bannerUpload.routes.js";
import eventRoutes from "./routes/events.js";
import calendarRoutes from "./routes/calendar.js";
import publicRoutes from "./routes/public.js";
import magazineRoutes from "./routes/magazineRoutes.js";
import adminUsersRoutes from "./routes/adminUsers.js";
import adminIndustriesRoutes from "./routes/adminIndustryRoutes.js";
import jobAlertsRoutes from "./routes/jobAlerts.js";
import paymentsRoutes from "./routes/payments.js";
import adminAnalyticsRoutes from "./routes/adminAnalytics.js";
import contactRoutes from "./routes/contact.js";
import newsletterRoutes from "./routes/newsletter.js";
import leadRoutes from "./routes/Leadroutes.js";
import quoteRoutes from "./routes/Quoteroutes.js";
import teamRoutes from "./routes/team.js";
import companyTeamRoutes from "./routes/companyTeam.js";
import adminPackageRoutes from "./routes/adminPackageRoutes.js";
import candidateSkillsRoutes from "./routes/candidateSkillsRoutes.js";
import candidateEducationRoutes from "./routes/candidateEducationRoutes.js";
import candidateProjectRoutes from "./routes/candidateProjectRoutes.js";
import candidateSocialRoutes from "./routes/candidateSocialRoutes.js";
import candidateCertificationRoutes from "./routes/candidateCertificationRoutes.js";
import candidateLanguageRoutes from "./routes/candidateLanguageRoutes.js";
import candidateAchievementRoutes from "./routes/candidateAchievementRoutes.js";
import candidateInterestRoutes from "./routes/candidateInterestRoutes.js";

import candidateExperienceRoutes from "./routes/candidateExperienceRoutes.js";
// ✅ RBAC: sub-admin management routes
import adminSubAdminRoutes from "./routes/adminSubAdminRoutes.js";
// ✅ RBAC v2: role management + activity log routes
import adminRoleRoutes from "./routes/adminRoleRoutes.js";
import adminActivityRoutes from "./routes/adminActivityRoutes.js";
// ✅ FIX: this route file existed in the controller but was never
// wired up anywhere — GET /api/admin/permissions was 404ing because
// of this missing import + mount, not because of anything in
// adminSubAdminRoutes.js (despite the old log message claiming so).
import adminPermissionRoutes from "./routes/adminPermissionRoutes.js";

// ✅ auto-seed Permission table + prisma client for it
import { prisma } from "./lib/prisma.js";
import { ensurePermissionsSeeded } from "./lib/permissions.js";
// ✅ RBAC v2: auto-seed default system Roles (Super Admin, Sub
// Admin, Moderator, Support Staff) + their default RolePermission sets
import { ensureRolesSeeded } from "./lib/roles.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ======================================================
   🚀 APP INIT
====================================================== */

const app = express();

/* ==========================
   🧰 Middlewares
========================== */

app.use(cors());
app.use(express.json());
app.use("/api/contact", contactRoutes);

/* ==========================
   🏠 Default Route
========================== */

app.get("/", (req, res) => {
  res.json({ message: "✅ Newsprk backend running" });
});

/* ==========================
   💚 Health Check Route
========================== */

app.get("/health", async (req, res) => {
  try {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().rss,
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(500).json({ status: "error" });
  }
});

/* ==========================
   🔗 API Routes - ORDER MATTERS!
   More specific routes MUST be registered first
========================== */

// ✅ COMPANY ROUTES - Specific to Generic order
app.use("/api/companies", companyTeamRoutes);        // /api/companies/:slug/team
app.use("/api/companies", companyArticlesRoutes);    // /api/companies/:slug/articles
app.use("/api/companies", companiesRoutes);          // /api/companies/:slug (MUST BE LAST)

// Other routes
app.use("/api/posts", postsRoutes);
app.use("/api/authors", authorsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/jobs", jobsRoutes);

app.use("/api/companies", companyArticlesRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/admin/companies", adminCompaniesRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/recruiters", recruitersRoutes);
app.use("/api/candidates", candidatesRoutes);

// ✅ CANDIDATE ROUTES - All mounted
app.use("/api/candidate-skills", candidateSkillsRoutes);
app.use("/api/candidate-education", candidateEducationRoutes);
app.use("/api/candidate-projects", candidateProjectRoutes);
app.use("/api/candidate-socials", candidateSocialRoutes);
app.use("/api/candidate-certifications", candidateCertificationRoutes);
app.use("/api/candidate-languages", candidateLanguageRoutes);
app.use("/api/candidate-achievements", candidateAchievementRoutes);
app.use("/api/candidate-interests", candidateInterestRoutes);

app.use("/api/candidate-experience", candidateExperienceRoutes);

app.use("/api/recruiter", recruiterDashboardRoutes);
app.use("/api/recruiter", recruiterArticlesRoutes);
app.use("/api/team", teamRoutes);
app.use("/api/suppliers", supplierDirectoryRoutes);
app.use("/api/suppliers", quoteRoutes);

// ✅ ADMIN ROUTES - ORDER MATTERS!
console.log("🔵 Mounting admin package routes...");
app.use("/api/admin", adminPackageRoutes);
console.log("✅ Admin package routes mounted at /api/admin");

app.use("/api/admin", adminDirectoryRoutes);
app.use("/api/admin", adminArticlesRoutes);
app.use("/api/admin", adminUsersRoutes);
app.use("/api/admin", adminAnalyticsRoutes);

// ✅ RBAC — sub-admin CRUD
console.log("🔵 Mounting admin sub-admin (RBAC) routes...");
app.use("/api/admin", adminSubAdminRoutes);
console.log("✅ Admin sub-admin routes mounted at /api/admin");

// ✅ RBAC v2 — role CRUD + role permission management
console.log("🔵 Mounting admin role (RBAC v2) routes...");
app.use("/api/admin", adminRoleRoutes);
console.log("✅ Admin role routes mounted at /api/admin");

// ✅ FIX: this was the actually-missing mount — GET /api/admin/permissions
// (and any future permission-catalogue endpoints) live here.
console.log("🔵 Mounting admin permission catalogue routes...");
app.use("/api/admin", adminPermissionRoutes);
console.log("✅ Admin permission routes mounted at /api/admin");

// ✅ sub-admin activity / tracking dashboard feed
console.log("🔵 Mounting admin activity routes...");
app.use("/api/admin", adminActivityRoutes);
console.log("✅ Admin activity routes mounted at /api/admin");

app.use("/api/banners", bannerRoutes);
app.use("/api/banners", bannerUploadRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api", publicRoutes);
app.use("/api/magazines", magazineRoutes);
app.use("/api/job-alerts", jobAlertsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api", adminIndustriesRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/quotes", quoteRoutes);

/* ==========================
   🚀 Start Server
========================== */

const PORT = process.env.PORT || 5000;

async function start() {
  await ensurePermissionsSeeded(prisma);
  await ensureRolesSeeded(prisma);

  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
}

start();