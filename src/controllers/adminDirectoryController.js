// C:\Users\Dell\OneDrive\Desktop\tooling\newsprk-backend\src\controllers\adminDirectoryController.js

import prisma from "../prismaClient.js"
import bcrypt from "bcrypt";
import slugify from "slugify";
import { isAdminStaff } from "../lib/permissions.js"

// ✅ Updated include to include lastLoginAt and emailSentForBulkImport
const submittedByInclude = {
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
}

function mapDirectory(directory) {
  if (!directory) return directory
  const { User_SupplierDirectory_submittedByIdToUser, Company, ...rest } = directory
  return {
    ...rest,
    submittedBy: User_SupplierDirectory_submittedByIdToUser ?? null,
    company: Company ?? rest.company ?? null,
  }
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export async function getPendingDirectories(req, res) {
  if (!isAdminStaff(req.user?.role)) {
    return res.status(403).json({ error: "Admin only" })
  }

  const directories = await prisma.supplierDirectory.findMany({
    where: {
      status: "PENDING",
    },
    orderBy: { createdAt: "asc" },
    include: submittedByInclude,
  })

  res.json(directories.map(mapDirectory))
}

export async function getDirectoryForReview(req, res) {
  if (!isAdminStaff(req.user?.role)) {
    return res.status(403).json({ error: "Admin only" })
  }

  const directoryId = Number(req.params.id)

  const directory = await prisma.supplierDirectory.findUnique({
    where: { id: directoryId },
    include: {
      ...submittedByInclude,
      Company: {
        select: { id: true, name: true, logoUrl: true },
      },
    },
  })

  if (!directory) {
    return res.status(404).json({ error: "Directory not found" })
  }

  res.json(mapDirectory(directory))
}

export async function approveDirectory(req, res) {
  if (!isAdminStaff(req.user?.role)) {
    return res.status(403).json({ error: "Admin only" })
  }

  const directoryId = Number(req.params.id)

  const directory = await prisma.supplierDirectory.update({
    where: { id: directoryId },
    data: {
      status: "APPROVED",
      isLiveEditable: true,
      approvedById: req.user.userId ?? req.user.id,
      approvedAt: new Date(),
    },
  })

  await prisma.auditLog.create({
    data: {
      action: "DIRECTORY_APPROVED",
      entity: "SupplierDirectory",
      entityId: directory.id,
      userId: req.user.userId ?? req.user.id,
    },
  })

  res.json({ message: "Directory approved", directory })
}

export async function rejectDirectory(req, res) {
  if (!isAdminStaff(req.user?.role)) {
    return res.status(403).json({ error: "Admin only" })
  }

  const directoryId = Number(req.params.id)

  await prisma.supplierDirectory.update({
    where: { id: directoryId },
    data: { status: "REJECTED" },
  })

  await prisma.auditLog.create({
    data: {
      action: "DIRECTORY_REJECTED",
      entity: "SupplierDirectory",
      entityId: directoryId,
      userId: req.user.userId ?? req.user.id,
    },
  })

  res.json({ message: "Directory rejected" })
}

export async function adminCreateDirectory(req, res) {
  if (!isAdminStaff(req.user?.role)) {
    return res.status(403).json({ error: "Admin only" });
  }

  const {
    name,
    slug,
    description,
    logoUrl,
    companyId,
    submittedById,
  } = req.body;

  const directory = await prisma.supplierDirectory.create({
    data: {
      name,
      slug,
      description,
      logoUrl,
      companyId: Number(companyId),
      submittedById: Number(submittedById),
      status: "APPROVED",
      isLiveEditable: true,
      approvedById: req.user.userId ?? req.user.id,
      approvedAt: new Date(),
    },
  });

  res.status(201).json(directory);
}

/* =========================================
   ✅ HELPER: Generate a unique username
========================================= */
async function generateUniqueUsername(email) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

  // Try base first
  const existing = await prisma.user.findUnique({ where: { username: base } })
  if (!existing) return base

  // Keep trying with random 4-digit suffix until unique
  let username = ""
  let isUnique = false

  while (!isUnique) {
    const suffix = Math.floor(1000 + Math.random() * 9000)
    username = `${base}${suffix}`
    const taken = await prisma.user.findUnique({ where: { username } })
    if (!taken) isUnique = true
  }

  return username
}

export async function adminCreateFullSetup(req, res) {
  if (!isAdminStaff(req.user?.role)) {
    return res.status(403).json({ error: "Admin only" });
  }

  const { company, recruiter, directory } = req.body;

  try {
    // Generate unique username
    const uniqueUsername = await generateUniqueUsername(recruiter.email);

    const result = await prisma.$transaction(async (tx) => {

      /* ==============================
         1️⃣ VALIDATE INDUSTRY
      ============================== */
      const industry = await tx.industry.findUnique({
        where: { id: Number(company.industryId) },
      });

      if (!industry) {
        throw new Error("Invalid industry selected");
      }

      /* ==============================
         2️⃣ CREATE COMPANY
      ============================== */
      let companySlug = slugify(company.name, {
        lower: true,
        strict: true,
      });

      const existingCompany = await tx.company.findUnique({
        where: { slug: companySlug },
      });

      if (existingCompany) {
        companySlug = `${companySlug}-${Date.now()}`;
      }

      const newCompany = await tx.company.create({
        data: {
          name: company.name,
          slug: companySlug,
          description: company.description,
          website: company.website,
          location: company.location,
          address: company.address,
          industryId: Number(company.industryId),
          logoUrl: company.logoUrl,
          isVerified: true,
        },
      });

      /* ==============================
         3️⃣ CHECK EMAIL
      ============================== */
      const existingUser = await tx.user.findUnique({
        where: {
          email: recruiter.email,
        },
      });

      if (existingUser) {
        throw new Error("A user with this email already exists.");
      }

      /* ==============================
         4️⃣ CREATE RECRUITER
      ============================== */
      const hashedPassword = await bcrypt.hash(recruiter.password, 10);

      const newRecruiter = await tx.user.create({
        data: {
          email: recruiter.email,
          username: uniqueUsername,
          password: hashedPassword,
          role: "recruiter",
          fullName: recruiter.fullName,
          companyId: newCompany.id,
          emailVerified: true,
          emailSentForBulkImport: false,
          isOnboarded: false,
          lastLoginAt: null,
        },
      });

      /* ==============================
         5️⃣ CREATE DIRECTORY
      ============================== */
      let directorySlug = slugify(directory.name, {
        lower: true,
        strict: true,
      });

      const existingDirectory = await tx.supplierDirectory.findUnique({
        where: { slug: directorySlug },
      });

      if (existingDirectory) {
        directorySlug = `${directorySlug}-${Date.now()}`;
      }

      const newDirectory = await tx.supplierDirectory.create({
        data: {
          name: directory.name,
          slug: directorySlug,
          description: directory.description,
          website: directory.website,
          phoneNumber: directory.phoneNumber,
          email: directory.email,
          logoUrl: directory.logoUrl,
          videoGallery: directory.videoGallery || [],
          socialLinks: directory.socialLinks || {},
          companyId: newCompany.id,
          submittedById: newRecruiter.id,
          status: "APPROVED",
          isLiveEditable: true,
          approvedById: req.user.userId ?? req.user.id,
          approvedAt: new Date(),
        },
      });

      /* ==============================
         6️⃣ AUDIT LOG
      ============================== */
      await tx.auditLog.create({
        data: {
          action: "FULL_DIRECTORY_CREATED",
          entity: "SupplierDirectory",
          entityId: newDirectory.id,
          userId: req.user.userId ?? req.user.id,
        },
      });

      return {
        company: newCompany,
        recruiter: newRecruiter,
        directory: newDirectory,
      };
    });

    res.status(201).json(result);

  } catch (error) {
    console.error("FULL SETUP ERROR:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Email already exists.",
      });
    }

    return res.status(400).json({
      error: error.message || "Failed to create full setup",
    });
  }
}

export async function adminUpdateDirectory(req, res) {
  try {
    if (!isAdminStaff(req.user?.role)) {
      return res.status(403).json({ error: "Admin only" })
    }

    const directoryId = Number(req.params.id)
    if (!Number.isInteger(directoryId)) {
      return res.status(400).json({ error: "Invalid directory id" })
    }

    const existing = await prisma.supplierDirectory.findUnique({
      where: { id: directoryId },
    })

    if (!existing) {
      return res.status(404).json({ error: "Directory not found" })
    }

    const {
      name,
      slug,
      description,
      website,
      logoUrl,
      phoneNumber,
      email,
      googleMapUrl,
      tradeNames,
      socialLinks,
    } = req.body

    const data = {}

    if (name !== undefined) {
      const nextName = String(name).trim()
      if (!nextName) {
        return res.status(400).json({ error: "Name is required" })
      }
      data.name = nextName
    }

    if (description !== undefined) {
      const nextDescription = String(description)
      if (!nextDescription.trim()) {
        return res.status(400).json({ error: "Description is required" })
      }
      data.description = nextDescription
    }

    if (website !== undefined) data.website = website ? String(website).trim() : null
    if (logoUrl !== undefined) data.logoUrl = logoUrl ? String(logoUrl).trim() : null
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber ? String(phoneNumber).trim() : null
    if (email !== undefined) data.email = email ? String(email).trim() : null
    if (googleMapUrl !== undefined) data.googleMapUrl = googleMapUrl ? String(googleMapUrl).trim() : null

    if (slug !== undefined) {
      const nextSlug = slugify(String(slug), { lower: true, strict: true })
      if (!nextSlug) {
        return res.status(400).json({ error: "Slug is required" })
      }
      if (nextSlug !== existing.slug) {
        const taken = await prisma.supplierDirectory.findUnique({ where: { slug: nextSlug } })
        if (taken) {
          return res.status(409).json({ error: "Slug already in use" })
        }
        data.slug = nextSlug
      }
    }

    if (tradeNames !== undefined) {
      data.tradeNames = toStringArray(tradeNames)
    }

    if (socialLinks !== undefined && socialLinks && typeof socialLinks === "object" && !Array.isArray(socialLinks)) {
      data.socialLinks = socialLinks
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No fields to update" })
    }

    const directory = await prisma.supplierDirectory.update({
      where: { id: directoryId },
      data,
      include: {
        ...submittedByInclude,
        Company: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    })

    if (logoUrl !== undefined && existing.companyId) {
      await prisma.company.update({
        where: { id: existing.companyId },
        data: { logoUrl: data.logoUrl ?? null },
      })
    }

    await prisma.auditLog.create({
      data: {
        action: "DIRECTORY_UPDATED",
        entity: "SupplierDirectory",
        entityId: directory.id,
        userId: req.user.userId ?? req.user.id,
      },
    })

    res.json({ message: "Directory updated", directory: mapDirectory(directory) })
  } catch (err) {
    console.error("Admin update directory error:", err)
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Slug already in use" })
    }
    res.status(500).json({ error: "Failed to update directory" })
  }
}