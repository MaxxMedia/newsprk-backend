import prisma from "../prismaClient.js"
import {
  assertProductListingCount,
  getCompanyDirectoryCount,
  getProductListingEligibility,
} from "../lib/packageContentLimits.js"

/**
 * Recruiter submits directory (FIRST TIME)
 */
// export const createDirectory = async (req, res) => {
//   try {
//     const user = req.user

//     if (user.role !== "recruiter") {
//       return res.status(403).json({ error: "Only recruiters can submit directories" })
//     }

//     const {
//       name, slug, description, website, logoUrl, coverImageUrl,
//       phoneNumber, email, tradeNames, videoGallery, socialLinks, productSupplies,
//     } = req.body

//     const directory = await prisma.supplierDirectory.create({
//       data: {
//         name, slug, description, website, logoUrl, coverImageUrl,
//         phoneNumber, email, tradeNames, videoGallery, socialLinks, productSupplies,
//         companyId: user.companyId,
//         status: "PENDING",
//         isLiveEditable: false,
//         submittedById: user.id,
//       },
//     })

//     res.status(201).json(directory)
//   } catch (err) {
//     console.error("Create directory error:", err)
//     res.status(500).json({ error: "Failed to create directory" })
//   }
// }

export const createDirectory = async (req, res) => {
  try {
    const user = req.user

    if (user.role !== "recruiter") {
      return res.status(403).json({ error: "Only recruiters can submit directories" })
    }

   const {
  name,
  slug,
  description,
  website,
  logoUrl,
  coverImageUrl,
  phoneNumber,
  email,

  tradeNames,
  socialLinks,

  videoGallery,
  productGallery,
  companyGallery,
  factoryGallery,

  companyBrochure,
  certifications,

  brandsRepresented,
  industriesServed,
  exportMarkets,

  manufacturingCapabilities,
  machineryList,
  qualityStandards,

  enableInquiryForm,

  productSupplies,

  location,
  address,
  industryId,
} = req.body

    /* ==============================
       1️⃣ Validate required fields
    ============================== */
    if (!location || !address || !industryId) {
      return res.status(400).json({
        error: "Location, address and industry are required",
      })
    }

    /* ==============================
       2️⃣ Validate Industry Exists
    ============================== */
    const industry = await prisma.industry.findUnique({
      where: { id: Number(industryId) },
    })

    if (!industry) {
      return res.status(400).json({ error: "Invalid industry selected" })
    }

    const existingDirectories = await getCompanyDirectoryCount(user.companyId)
    const requestedDirectories = existingDirectories + 1

    try {
      await assertProductListingCount(user.companyId, requestedDirectories)
    } catch (err) {
      return res.status(err.status || 403).json({
        error: err.message,
        code: err.code,
        eligibility: err.eligibility,
      })
    }

    /* ==============================
       3️⃣ Update Company Info
    ============================== */
    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        location,
        address,
        industryId: Number(industryId),
      },
    })

    /* ==============================
       4️⃣ Create Directory
    ============================== */
    const directory = await prisma.supplierDirectory.create({
      data: {
        name,
        slug,
        description,
        website,
        logoUrl,
        coverImageUrl,
        phoneNumber,
        email,
        tradeNames,
        videoGallery,
productGallery,
companyGallery,
factoryGallery,
productCatalogues,

companyBrochure,
certifications,

brandsRepresented,
industriesServed,
exportMarkets,

manufacturingCapabilities,
machineryList,
qualityStandards,

enableInquiryForm,

socialLinks,
productSupplies,
        companyId: user.companyId,
        status: "PENDING",
        isLiveEditable: false,
        submittedById: user.id,
      },
    })

    res.status(201).json(directory)

  } catch (err) {
    console.error("Create directory error:", err)
    res.status(500).json({ error: "Failed to create directory" })
  }
}

/**
 * Admin approves directory (ONLY ONCE)
 */
export const approveDirectory = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "admin") return res.status(403).json({ error: "Admin only" })

    const directoryId = Number(req.params.id)
    const directory = await prisma.supplierDirectory.update({
      where: { id: directoryId },
      data: {
        status: "APPROVED",
        isLiveEditable: true,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: { action: "DIRECTORY_APPROVED", entity: "SupplierDirectory", entityId: directory.id, userId: user.id },
    })

    res.json(directory)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Approval failed" })
  }
}

/**
 * Get single recruiter directory by ID
 */
export const getMyDirectoryById = async (req, res) => {
  try {
    const user = req.user
    const directoryId = Number(req.params.id)

    if (user.role !== "recruiter") return res.status(403).json({ error: "Not allowed" })

   const directory = await prisma.supplierDirectory.findFirst({
    where:{
        id:directoryId,
        submittedById:user.id,
    }
})

    if (!directory) return res.status(404).json({ error: "Directory not found" })

    res.json(directory)
  } catch (err) {
    console.error("Get directory by id error:", err)
    res.status(500).json({ error: "Failed to load directory" })
  }
}

export const getProductListingEligibilityHandler = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const eligibility = await getProductListingEligibility(user.companyId ?? null)
    res.json(eligibility)
  } catch (err) {
    console.error("Product listing eligibility error:", err)
    res.status(500).json({ error: "Failed to load product listing eligibility" })
  }
}

/**
 * Get recruiter directories
 */
export const getMyDirectories = async (req, res) => {
  try {
    const user = req.user
    if (user.role !== "recruiter") return res.status(403).json({ error: "Not allowed" })

    if (user.companyId) {
      await prisma.supplierDirectory.updateMany({
        where: { submittedById: user.id, companyId: null },
        data: { companyId: user.companyId },
      })
    }

    const directories = await prisma.supplierDirectory.findMany({
      where: user.companyId
        ? {
            OR: [
              { companyId: user.companyId },
              { submittedById: user.id },
            ],
          }
        : { submittedById: user.id },
      orderBy: { createdAt: "desc" },
      select:{
   id:true,
   name:true,
   slug:true,
   status:true,
   isLiveEditable:true,
   createdAt:true,

   logoUrl:true,
   coverImageUrl:true,

   productSupplies:true,
   productCategories:true,

   videoGallery:true,
   productGallery:true,
   companyGallery:true,
   factoryGallery:true,
   productCatalogues:true,

   companyBrochure:true,
   certifications:true,

   brandsRepresented:true,
   industriesServed:true,
   exportMarkets:true,

   manufacturingCapabilities:true,
   machineryList:true,
   qualityStandards:true,

   enableInquiryForm:true,
},
    })

    res.json(directories)
  } catch (err) {
    console.error("Get recruiter directories error:", err)
    res.status(500).json({ error: "Failed to load directories" })
  }
}

/**
 * Recruiter updates directory (LIVE after approval)
 */
export const updateDirectory = async (req, res) => {
  try {
    const user = req.user
    const directoryId = Number(req.params.id)

    const directory = await prisma.supplierDirectory.findUnique({ where: { id: directoryId } })

    if (!directory) return res.status(404).json({ error: "Directory not found" })
    if (directory.submittedById !== user.id) return res.status(403).json({ error: "Not allowed" })
    if (!directory.isLiveEditable) return res.status(400).json({ error: "Directory not approved yet" })

    const {
    name,
    description,
    website,
    logoUrl,
    coverImageUrl,
    phoneNumber,
    email,

    tradeNames,
    socialLinks,

    videoGallery,
    productGallery,
    companyGallery,
    factoryGallery,
    productCatalogues,
    productCategories,

    companyBrochure,
    certifications,

    brandsRepresented,
    industriesServed,
    exportMarkets,

    manufacturingCapabilities,
    machineryList,
    qualityStandards,

    enableInquiryForm,

    productSupplies,

    slug,
} = req.body

    if (slug && slug !== directory.slug) return res.status(400).json({ error: "Slug cannot be changed" })

    const updated = await prisma.supplierDirectory.update({
      where: { id: directoryId },
      data:{
    name,
    description,
    website,
    logoUrl,
    coverImageUrl,
    phoneNumber,
    email,

    tradeNames,
    socialLinks,

    videoGallery,
    productGallery,
    companyGallery,
    factoryGallery,
    productCatalogues,
    productCategories,

    companyBrochure,
    certifications,

    brandsRepresented,
    industriesServed,
    exportMarkets,

    manufacturingCapabilities,
    machineryList,
    qualityStandards,

    enableInquiryForm,

    productSupplies,
},
    })

    await prisma.auditLog.create({
      data: { action: "DIRECTORY_UPDATED_LIVE", entity: "SupplierDirectory", entityId: updated.id, userId: user.id },
    })

    res.json(updated)
  } catch (err) {
    console.error("Update directory error:", err)
    res.status(500).json({ error: "Update failed" })
  }
}

/* =========================================
   ✅ HELPER: Recursively get all descendant
   industry IDs for a given parent ID.
   e.g. "Additive Manufacturing" → [its id,
   all children ids, all grandchildren ids...]
========================================= */
async function getAllDescendantIndustryIds(parentId) {
  const ids = [parentId]

  const children = await prisma.industry.findMany({
    where: { parentId },
    select: { id: true },
  })

  for (const child of children) {
    const childIds = await getAllDescendantIndustryIds(child.id)
    ids.push(...childIds)
  }

  return ids
}

/* =========================================
   ✅ FIXED: Get approved suppliers with
   full filter support including industry tree
   GET /api/suppliers?name=&location=&category=
     &industryId=&featured=&page=&limit=&sort=
========================================= */
export const getSuppliers = async (req, res) => {
  try {
    const {
      name,
      location,
      category,
      industryId,
      featured,
      page  = "1",
      limit = "15",
      sort  = "alphabetical",
    } = req.query

    const pageNum  = Math.max(1, parseInt(page))
    const limitNum = Math.max(1, parseInt(limit))
    const skip     = (pageNum - 1) * limitNum

    // ✅ Resolve all descendant industry IDs so selecting a parent
    // also returns suppliers tagged under any of its children/grandchildren
    let industryIds = null
    if (industryId) {
      industryIds = await getAllDescendantIndustryIds(Number(industryId))
    }

    // ✅ Build dynamic where clause
    const where = {
      status: "APPROVED",

      // Filter by supplier name
      ...(name && {
        name: { contains: name },
      }),

      // Filter by company location
      ...(location && {
        Company: {
          location: { contains: location },
        },
      }),

      // Filter by product category (name or description)
      ...(category && {
        OR: [
          { name:        { contains: category } },
          { description: { contains: category } },
        ],
      }),

      // ✅ Industry filter — matches company's industryId
      // Uses the full descendant tree so parent selection works
      ...(industryIds && {
        Company: {
          industryId: { in: industryIds },
        },
      }),

      // Featured filter (add isFeatured field to schema if needed)
      ...(featured === "true" && {
        isFeatured: true,
      }),
    }

    // Sort options
    const orderBy =
      sort === "newest"  ? { createdAt: "desc" } :
      sort === "popular" ? { views: "desc" }      :
                           { name: "asc" }         // alphabetical default

    // Run count + data in parallel for performance
    const [total, suppliers] = await Promise.all([
      prisma.supplierDirectory.count({ where }),
      prisma.supplierDirectory.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          Company: {
            select: {
              id: true,
              name: true,
              location: true,
              industryId: true,
              Industry: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ])

    res.json({
      data: suppliers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    })
  } catch (err) {
    console.error("getSuppliers error:", err)
    res.status(500).json({ error: "Failed to fetch suppliers" })
  }
}

/**
 * Get supplier showroom by slug
 */
export const getSupplierBySlug = async (req, res) => {
  try {
    const { slug } = req.params

    const supplier = await prisma.supplierDirectory.findUnique({
      where: { slug },
      include: {
        Company: {
          select: { id: true, name: true, location: true, Industry: true, website: true },
        },
      },
    })

    if (!supplier || supplier.status !== "APPROVED") {
      return res.status(404).json({ error: "Supplier not found" })
    }

    await prisma.supplierDirectory.update({
      where: { id: supplier.id },
      data: { views: { increment: 1 } },
    })

    res.json(supplier)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch supplier" })
  }
}

/**
 * ADMIN: Get all directories (for review & management)
 */
export const getAllDirectoriesForAdmin = async (req, res) => {
  try {
    const directories = await prisma.supplierDirectory.findMany({
      orderBy: { createdAt: "desc" },
      include: {
      Company: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },

      User_SupplierDirectory_submittedByIdToUser: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },

      User_SupplierDirectory_approvedByIdToUser: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

    res.json(directories)
  } catch (err) {
    console.error("Admin fetch directories error:", err)
    res.status(500).json({ error: "Failed to fetch directories" })
  }
}

/**
 * Track directory connection click
 */
export const trackDirectoryConnection = async (req, res) => {
  try {
    const { id } = req.params

    await prisma.supplierDirectory.update({
      where: { id: Number(id) },
      data: { connections: { increment: 1 } },
    })

    res.json({ success: true })
  } catch (err) {
    console.error("Track connection error:", err)
    res.status(500).json({ error: "Failed to track connection" })
  }
}