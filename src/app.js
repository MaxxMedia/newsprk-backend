// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import postsRoutes from "./routes/posts.js";
// import authorsRoutes from "./routes/authors.js";
// import categoriesRoutes from "./routes/categories.js";
// import commentsRoutes from "./routes/comments.js";
// import authRoutes from "./routes/auth.js";
// import uploadRoutes from "./routes/uploadRoutes.js";  // ✅ for Cloudinary package changed
// import { requireAuth, requireAdmin } from "./middleware/auth.js";
// import jobsRoutes from "./routes/jobs.js";
// import companiesRoutes from "./routes/companies.js";
// import applicationsRoutes from "./routes/applications.js";
// import recruitersRoutes from "./routes/recruiters.js"
// import candidatesRoutes from "./routes/candidates.js"
// import recruiterDashboardRoutes from "./routes/recruiterDashboard.js"
// import supplierDirectoryRoutes from "./routes/supplierDirectories.js"
// import adminDirectoryRoutes from "./routes/adminDirectories.js"
// import publicSupplierRoutes from "./routes/publicSuppliers.js"
// import recruiterArticlesRoutes from "./routes/recruiterArticles.js"
// import companyArticlesRoutes from "./routes/companyArticles.js"
// import adminArticlesRoutes from "./routes/adminArticles.js"
// import bannerRoutes from "./routes/banner.routes.js"
// import bannerUploadRoutes from "./routes/bannerUpload.routes.js"
// import eventRoutes from "./routes/events.js"
// import calendarRoutes from "./routes/calendar.js"
// import publicRoutes from "./routes/public.js"




// dotenv.config();

// const app = express();

// // 🧰 Middlewares 
// app.use(cors());
// app.use(express.json());

// // 🏠 Default route (for Render health check)
// app.get("/", (req, res) => {
//   res.json({ message: "✅ Newsprk backend running" });
// });

// // 🔗 Mount routes (only once)
// app.use("/api/posts", postsRoutes);
// app.use("/api/authors", authorsRoutes);
// app.use("/api/categories", categoriesRoutes);
// app.use("/api/comments", commentsRoutes);
// app.use("/api/auth", authRoutes);
// app.use("/api/upload", uploadRoutes); // ✅ Cloudinary upload route
// app.use("/api/jobs", jobsRoutes);     // ✅ Jobs routes
// app.use("/api/companies", companyArticlesRoutes)
// app.use("/api/companies", companiesRoutes);  // ✅ Companies routes
// app.use("/api/applications", applicationsRoutes);
// app.use("/api/recruiters", recruitersRoutes)
// app.use("/api/candidates", candidatesRoutes)
// app.use("/api/recruiter", recruiterDashboardRoutes)
// app.use("/api/suppliers", supplierDirectoryRoutes)
// app.use("/api/admin", adminDirectoryRoutes)
// app.use("/api/suppliers", publicSupplierRoutes)
// app.use("/api/recruiter", recruiterArticlesRoutes)
// app.use("/api/admin", adminArticlesRoutes)
// app.use("/api/banners", bannerRoutes);
// app.use("/api/banners", bannerUploadRoutes);
// app.use("/api/events", eventRoutes)
// app.use("/api/calendar", calendarRoutes)
// app.use("/api", publicRoutes) 





// // 🚀 Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));



import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
import applicationsRoutes from "./routes/applications.js";
import recruitersRoutes from "./routes/recruiters.js";
import candidatesRoutes from "./routes/candidates.js";
import recruiterDashboardRoutes from "./routes/recruiterDashboard.js";
import supplierDirectoryRoutes from "./routes/supplierDirectories.js";
import adminDirectoryRoutes from "./routes/adminDirectories.js";
import publicSupplierRoutes from "./routes/publicSuppliers.js";
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



/* ======================================================
   ✅ FIX: Proper .env loading (IMPORTANT FOR TURNSTILE)
====================================================== */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

console.log("🔑 TURNSTILE_SECRET_KEY Loaded?:", !!process.env.TURNSTILE_SECRET_KEY);
console.log("RESEND KEY EXISTS:", !!process.env.RESEND_API_KEY)

/* ======================================================
   🚀 APP INIT
====================================================== */

const app = express();

/* ==========================
   🧰 Middlewares
========================== */

app.use(cors());
app.use(express.json());

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
   🔗 API Routes
========================== */

app.use("/api/posts", postsRoutes);
app.use("/api/authors", authorsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/companies", companyArticlesRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/recruiters", recruitersRoutes);
app.use("/api/candidates", candidatesRoutes);
app.use("/api/recruiter", recruiterDashboardRoutes);
app.use("/api/suppliers", supplierDirectoryRoutes);
app.use("/api/admin", adminDirectoryRoutes);
app.use("/api/suppliers", publicSupplierRoutes);
app.use("/api/recruiter", recruiterArticlesRoutes);
app.use("/api/admin", adminArticlesRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/banners", bannerUploadRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api", publicRoutes);
app.use("/api/magazines", magazineRoutes);
app.use("/api/admin", adminUsersRoutes);
app.use("/api", adminIndustriesRoutes);  //admin industry routes don't have /admin prefix since some are public and some are admin-only. The controller handles the auth logic.


/* ==========================
   🚀 Start Server
========================== */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
