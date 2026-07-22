// C:\Users\Dell\OneDrive\Desktop\tooling\newsprk-backend\src\routes\adminDirectories.js

import express from "express"
import multer from "multer"

import {
  getPendingDirectories,
  getDirectoryForReview,
  approveDirectory,
  rejectDirectory,
  adminCreateDirectory,
  adminCreateFullSetup
} from "../controllers/adminDirectoryController.js"

import {
  sendBulkImportEmail
} from "../controllers/adminEmailController.js"

import { 
  bulkCreateFullSetup,
  downloadBulkTemplate,
  getBulkImportedUsers
} from "../controllers/adminBulkController.js"

import { requireAuth, requireAdmin } from "../middleware/auth.js"
import prisma from "../prismaClient.js"

const router = express.Router()

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
})

// =============================================
// ✅ MAIN ROUTE: /api/suppliers/admin (frontend uses this)
// =============================================
router.get(
  "/suppliers/admin",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      console.log("🔍 Fetching suppliers with user fields...")
      
      const directories = await prisma.supplierDirectory.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          Company: true,
          User_SupplierDirectory_submittedByIdToUser: {
            select: {
              id: true,
              email: true,
              fullName: true,
              username: true,
              isOnboarded: true,
              lastLoginAt: true,
              emailSentForBulkImport: true,
            },
          },
          User_SupplierDirectory_approvedByIdToUser: {
            select: {
              email: true,
            },
          },
        },
      })

      console.log(`📊 Found ${directories.length} directories`)
      
      // Map the data with proper field names
      const mappedDirectories = directories.map(dir => {
        const { User_SupplierDirectory_submittedByIdToUser, ...rest } = dir
        return {
          ...rest,
          submittedBy: User_SupplierDirectory_submittedByIdToUser ?? null,
          isVerified: dir.Company?.isVerified || false,
          isActive: dir.status === "APPROVED",
        }
      })

      res.json(mappedDirectories)
    } catch (error) {
      console.error("Error fetching suppliers:", error)
      res.status(500).json({ error: "Failed to fetch suppliers" })
    }
  }
)

// =============================================
// Directory review routes
// =============================================
router.get("/directories/pending", requireAuth, requireAdmin, getPendingDirectories)
router.get("/directories/:id", requireAuth, requireAdmin, getDirectoryForReview)
router.patch("/directories/:id/approve", requireAuth, requireAdmin, approveDirectory)
router.patch("/directories/:id/reject", requireAuth, requireAdmin, rejectDirectory)

// =============================================
// Create routes
// =============================================
router.post("/create-directory", requireAuth, requireAdmin, adminCreateDirectory)
router.post("/create-full-setup", requireAuth, requireAdmin, adminCreateFullSetup)

// =============================================
// Bulk upload routes
// =============================================
router.post(
  "/bulk-full-setup",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  bulkCreateFullSetup
)

router.get(
  "/bulk-full-setup/template",
  requireAuth,
  requireAdmin,
  downloadBulkTemplate
)

// =============================================
// Bulk import user management
// =============================================
router.get(
  "/bulk-import/users",
  requireAuth,
  requireAdmin,
  getBulkImportedUsers
)

router.post(
  "/bulk-import/:userId/send-email",
  requireAuth,
  requireAdmin,
  sendBulkImportEmail
)

// =============================================
// Debug routes
// =============================================
router.get(
  "/debug/recruiters",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      console.log("🔍 Debug: Fetching all recruiters")
      
      const users = await prisma.user.findMany({
        where: {
          role: "recruiter",
        },
        select: {
          id: true,
          email: true,
          username: true,
          emailSentForBulkImport: true,
          isOnboarded: true,
          lastLoginAt: true,
          createdAt: true,
          companyId: true,
          Company: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      console.log(`📊 Found ${users.length} recruiters`)
      
      res.json({
        total: users.length,
        users: users
      })
    } catch (error) {
      console.error("Debug error:", error)
      res.status(500).json({ error: error.message })
    }
  }
)

router.post(
  "/debug/fix-users",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const nullUsers = await prisma.user.findMany({
        where: {
          role: "recruiter",
          emailSentForBulkImport: null,
        },
        select: {
          id: true,
          email: true,
        },
      })

      console.log(`🔧 Found ${nullUsers.length} users with null emailSentForBulkImport`)

      const updated = await prisma.user.updateMany({
        where: {
          role: "recruiter",
          emailSentForBulkImport: null,
        },
        data: {
          emailSentForBulkImport: false,
        },
      })

      res.json({
        message: `Fixed ${updated.count} users`,
        fixedUsers: nullUsers.map(u => u.email)
      })
    } catch (error) {
      console.error("Fix users error:", error)
      res.status(500).json({ error: error.message })
    }
  }
)

export default router