// C:\Users\Dell\OneDrive\Desktop\tooling\newsprk-backend\src\controllers\adminBulkController.js

import prisma from "../prismaClient.js"
import bcrypt from "bcrypt"
import slugify from "slugify"
import xlsx from "xlsx"

/* =====================================================
   🔐 Generate Strong Random Password
===================================================== */
function generateRandomPassword(length = 12) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!%"

  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(
      Math.floor(Math.random() * chars.length)
    )
  }

  return password
}

function splitIndustryChunks(industryPath) {
  const raw = String(industryPath || "").trim()
  if (!raw) {
    return { chunks: [], createFrom: "" }
  }

  const collapsed = raw.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim()
  const newlineParts = raw.split(/[\n\r]+/).map((part) => part.trim()).filter(Boolean)
  const commaParts = collapsed.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean)

  const chunks = [collapsed, ...newlineParts]
  if (commaParts.length > 1) chunks.push(...commaParts)

  const seen = new Set()
  const uniqueChunks = chunks.filter((chunk) => {
    const key = chunk.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return {
    chunks: uniqueChunks,
    createFrom: newlineParts.length > 1 ? newlineParts[0] : commaParts.length > 1 ? commaParts[0] : collapsed,
  }
}

async function uniqueIndustrySlug(tx, name) {
  const base = slugify(name, { lower: true, strict: true }) || "industry"
  let slug = base
  let suffix = 2

  while (await tx.industry.findUnique({ where: { slug } })) {
    slug = `${base}-${suffix++}`
  }

  return slug
}

async function findIndustryByName(tx, name, parentId) {
  const where = {
    name: { equals: name, mode: "insensitive" },
  }

  if (parentId != null) {
    const underParent = await tx.industry.findFirst({
      where: { ...where, parentId },
    })
    if (underParent) return underParent
  }

  return tx.industry.findFirst({ where })
}

async function resolveOneIndustryPath(tx, pathOrName, { createIfMissing = false } = {}) {
  const levels = String(pathOrName)
    .split(">")
    .map((level) => level.trim())
    .filter(Boolean)

  if (!levels.length) return null

  let parentId = null
  let current = null

  for (const levelName of levels) {
    current = await findIndustryByName(tx, levelName, parentId)

    if (!current) {
      if (!createIfMissing) return null
      current = await tx.industry.create({
        data: {
          name: levelName,
          slug: await uniqueIndustrySlug(tx, levelName),
          parentId,
        },
      })
    }

    parentId = current.id
  }

  return current?.id || null
}

/* =====================================================
   🔍 Resolve Industry (creates missing names)
===================================================== */
async function resolveIndustryPath(tx, industryPath) {
  const { chunks, createFrom } = splitIndustryChunks(industryPath)
  if (!chunks.length) {
    throw new Error("Industry path is required")
  }

  for (const chunk of chunks) {
    const industryId = await resolveOneIndustryPath(tx, chunk, { createIfMissing: false })
    if (industryId) return industryId
  }

  const createdId = await resolveOneIndustryPath(tx, createFrom || chunks[0], { createIfMissing: true })
  if (createdId) return createdId

  throw new Error(`Industry not found: ${chunks[0]}`)
}

/* =====================================================
   🚀 BULK CREATE FULL SETUP
===================================================== */
export async function bulkCreateFullSetup(req, res) {
  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Admin only" })
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: "Excel file required" })
    }

    const workbook = xlsx.read(req.file.buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = xlsx.utils.sheet_to_json(sheet)

    const success = []
    const failed = []

    for (const row of rows) {
      let recruiter = null

      try {
        const email = String(row.email || "").trim()
        const companyName = String(row.companyName || "").trim()
        const directoryDescription = String(
          row.directoryDescription || row.description || ""
        ).trim()

        if (!email || !companyName || !row.industryPath) {
          throw new Error("Missing required fields")
        }

        const existingUser = await prisma.user.findUnique({
          where: { email },
        })

        if (existingUser) {
          throw new Error("Email already exists")
        }

        const username = email
          .split("@")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")

        const plainPassword = generateRandomPassword()
        const hashedPassword = await bcrypt.hash(plainPassword, 10)

        await prisma.$transaction(async (tx) => {
          const industryId = await resolveIndustryPath(tx, row.industryPath)

          const companySlug = slugify(companyName, {
            lower: true,
            strict: true,
          })

          const company = await tx.company.create({
            data: {
              name: companyName,
              slug: companySlug + "-" + Date.now(),
              website: row.website ? String(row.website).trim() : null,
              location: `${row.city || ""}, ${row.state || ""}, ${row.country || ""}`,
              address: row.address || null,
              industryId: industryId,
              description: row.description ? String(row.description).trim() : null,
              logoUrl: row.logoUrl || null,
              isVerified: true,
            },
          })

          recruiter = await tx.user.create({
            data: {
              email,
              username,
              password: hashedPassword,
              role: "recruiter",
              companyId: company.id,
              emailVerified: true,
              emailSentForBulkImport: false,
              isOnboarded: false,
              lastLoginAt: null,
            },
          })

          await tx.supplierDirectory.create({
            data: {
              name: companyName,
              slug: companySlug + "-directory-" + Date.now(),
              description: directoryDescription,
              phoneNumber: row.phoneNumber != null ? String(row.phoneNumber).trim() : null,
              email,
              website: row.website ? String(row.website).trim() : null,
              logoUrl: row.logoUrl || null,
              videoGallery: row.videoGallery
                ? row.videoGallery.split(",").map(v => v.trim())
                : [],
              socialLinks: {
                facebook: row.facebook || "",
                linkedin: row.linkedin || "",
                twitter: row.twitter || "",
                youtube: row.youtube || "",
                instagram: row.instagram || "",
              },
              companyId: company.id,
              submittedById: recruiter.id,
              status: "APPROVED",
              isLiveEditable: true,
              approvedById: req.user.id,
              approvedAt: new Date(),
            },
          })
        })

        success.push({
          email,
          company: companyName,
          userId: recruiter ? recruiter.id : null,
        })

      } catch (err) {
        failed.push({
          email: String(row.email || "Unknown").trim(),
          error: err.message,
        })
      }
    }

    res.json({
      message: "Bulk upload completed. Use the Send Email button to send credentials.",
      total: rows.length,
      successCount: success.length,
      failedCount: failed.length,
      success,
      failed,
    })

  } catch (error) {
    console.error("Bulk Upload Error:", error)
    res.status(500).json({ error: "Bulk upload failed" })
  }
}

/* =====================================================
   📥 DOWNLOAD FULL FEATURE TEMPLATE
===================================================== */
export async function downloadBulkTemplate(req, res) {
  try {
    const headers = [
      [
        "companyName",
        "email",
        "phoneNumber",
        "website",
        "country",
        "state",
        "city",
        "address",
        "industryPath",
        "logoUrl",
        "description",
        "directoryDescription",
        "videoGallery",
        "facebook",
        "linkedin",
        "twitter",
        "youtube",
        "instagram",
      ],
      [
        "ABC Moulds Pvt Ltd",
        "info@abcmoulds.com",
        "9876543210",
        "https://abcmoulds.com",
        "India",
        "Karnataka",
        "Bengaluru",
        "Whitefield Tech Park",
        "Binder Jetting",
        "https://example.com/logo.png",
        "Leading mould manufacturer",
        "We specialize in injection moulding solutions",
        "https://youtube.com/video1,https://youtube.com/video2",
        "https://facebook.com/abc",
        "https://linkedin.com/abc",
        "https://twitter.com/abc",
        "https://youtube.com/abc",
        "https://instagram.com/abc",
      ],
    ]

    const worksheet = xlsx.utils.aoa_to_sheet(headers)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, "Template")

    const buffer = xlsx.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    })

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=bulk_supplier_template.xlsx"
    )
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    res.send(buffer)

  } catch (error) {
    console.error("Template download error:", error)
    res.status(500).json({ error: "Failed to generate template" })
  }
}

/* =====================================================
   📋 GET ALL BULK IMPORTED USERS
   ✅ UPDATED: Returns ALL recruiter users
===================================================== */
export async function getBulkImportedUsers(req, res) {
  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Admin only" })
  }

  try {
    // ✅ Fetch ALL recruiter users - no filters
    const users = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.email,
        u.username,
        u."createdAt",
        u."emailSentForBulkImport",
        u."isOnboarded",
        u."lastLoginAt",
        c.name as "companyName"
      FROM "User" u
      LEFT JOIN "Company" c ON u."companyId" = c.id
      WHERE u.role = 'recruiter'
      ORDER BY u."createdAt" DESC
    `

    console.log(`📊 Found ${users.length} recruiter users`)

    const formattedUsers = users.map(user => ({
      id: Number(user.id),
      email: user.email,
      username: user.username,
      companyName: user.companyName || "N/A",
      createdAt: user.createdAt,
      emailSentForBulkImport: user.emailSentForBulkImport || false,
      isOnboarded: user.isOnboarded || false,
      lastLoginAt: user.lastLoginAt || null,
    }))

    console.log(`📤 Sending ${formattedUsers.length} users`)
    res.json(formattedUsers)

  } catch (error) {
    console.error("Error fetching bulk users:", error)
    res.status(500).json({ error: "Failed to fetch users" })
  }
}