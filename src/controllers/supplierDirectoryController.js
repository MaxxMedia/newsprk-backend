// controllers/supplierDirectoryController.js - FULL COMPLETE VERSION

import prisma from "../prismaClient.js";
import {
  assertProductListingCount,
  assertAndSanitizeSupplierDirectoryMedia,
  assertCompanyProfileLimits,
  getCompanyDirectoryCount,
  getProductListingEligibility,
  getCompanyProfileEligibility,
  countWords,
  getManufacturingCapabilitiesConfig,
  getMachineryListConfig,
} from "../lib/packageContentLimits.js";
import { getActiveSubscription } from "../lib/packagePurchases.js";
import { getRfqLeadsEligibilityForSupplier } from "../lib/Leadlimits.js";

async function getAllDescendantIndustryIds(parentId) {
  const ids = [parentId];

  const children = await prisma.industry.findMany({
    where: { parentId },
    select: { id: true },
  });

  for (const child of children) {
    const childIds = await getAllDescendantIndustryIds(child.id);
    ids.push(...childIds);
  }

  return ids;
}

export const createDirectory = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "recruiter") {
      return res.status(403).json({ error: "Only recruiters can submit directories" });
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
      googleMapUrl,

      tradeNames,
      socialLinks,

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
      manufacturingCapabilityImages,
      manufacturingCapabilityVideos,
      machineryList,
      machineryImages,
      qualityStandards,

      enableInquiryForm,

      productSupplies,

      location,
      address,
      industryId,
    } = req.body;

    if (!location || !address || !industryId) {
      return res.status(400).json({
        error: "Location, address and industry are required",
      });
    }

    const industry = await prisma.industry.findUnique({
      where: { id: Number(industryId) },
    });

    if (!industry) {
      return res.status(400).json({ error: "Invalid industry selected" });
    }

    // Check directory limit
    const existingDirectories = await getCompanyDirectoryCount(user.companyId);
    const requestedDirectories = existingDirectories + 1;

    try {
      await assertProductListingCount(user.companyId, requestedDirectories);
    } catch (err) {
      return res.status(err.status || 403).json({
        error: err.message,
        code: err.code,
        eligibility: err.eligibility,
      });
    }

    // Sanitize cover images and social links
    let sanitizedMedia;
    try {
      let coverImages = [];
      if (Array.isArray(coverImageUrl)) {
        coverImages = coverImageUrl;
      } else if (typeof coverImageUrl === "string" && coverImageUrl) {
        coverImages = [coverImageUrl];
      }

      sanitizedMedia = await assertAndSanitizeSupplierDirectoryMedia(user.companyId, {
        coverImages: coverImages,
        socialLinks,
      });
    } catch (err) {
      return res.status(err.status || 403).json({
        error: err.message,
        code: err.code,
      });
    }

    // Check all other profile limits
    let profileEligibility;
    try {
      profileEligibility = await assertCompanyProfileLimits(user.companyId, {
        description,
        googleMapUrl,
        productGallery,
        companyGallery,
        factoryGallery,
        videoGallery,
        productCatalogues,
        companyBrochure,
        certifications,
        brandsRepresented,
        industriesServed,
        exportMarkets,
        manufacturingCapabilities,
        manufacturingCapabilityImages,
        manufacturingCapabilityVideos,
        machineryList,
        machineryImages,
        qualityStandards,
        coverImages: sanitizedMedia.coverImages,
      });
    } catch (err) {
      return res.status(err.status || 403).json({
        error: err.message,
        code: err.code,
        eligibility: err.eligibility,
      });
    }

    // Get plan for configs
    const activeSubscription = await getActiveSubscription(user.companyId);
    const plan = activeSubscription.plan;
    const mfgConfig = getManufacturingCapabilitiesConfig(plan);
    const machineryConfig = getMachineryListConfig(plan);

    // Safety: null out features not allowed by package
    const isFeatureAllowed = (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return !!value;
    };

    const safeGoogleMapUrl = profileEligibility.googleMap ? googleMapUrl : null;
    const safeManufacturingCapabilities = mfgConfig.enabled ? manufacturingCapabilities : null;
    const safeManufacturingCapabilityImages = mfgConfig.hasImages ? manufacturingCapabilityImages : null;
    const safeManufacturingCapabilityVideos = mfgConfig.hasVideos ? manufacturingCapabilityVideos : null;
    const safeMachineryList = machineryConfig.enabled ? machineryList : null;
    const safeMachineryImages = machineryConfig.hasImages ? machineryImages : null;
    const safeQualityStandards = profileEligibility.qualityStandards ? qualityStandards : null;
    const safeExportMarkets = profileEligibility.exportMarkets ? exportMarkets : [];

    // Update company
    await prisma.company.update({
      where: { id: user.companyId },
      data: {
        location,
        address,
        industryId: Number(industryId),
      },
    });

    // Create directory
    const directory = await prisma.supplierDirectory.create({
      data: {
        name,
        slug,
        description,
        website,
        logoUrl,
        coverImageUrl: sanitizedMedia.coverImages,
        phoneNumber,
        email,
        googleMapUrl: safeGoogleMapUrl,
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
        exportMarkets: safeExportMarkets,
        manufacturingCapabilities: safeManufacturingCapabilities,
        manufacturingCapabilityImages: safeManufacturingCapabilityImages,
        manufacturingCapabilityVideos: safeManufacturingCapabilityVideos,
        machineryList: safeMachineryList,
        machineryImages: safeMachineryImages,
        qualityStandards: safeQualityStandards,
        enableInquiryForm,
        socialLinks: sanitizedMedia.socialLinks,
        productSupplies,
        companyId: user.companyId,
        status: "PENDING",
        isLiveEditable: false,
        submittedById: user.id,
      },
    });

    res.status(201).json(directory);
  } catch (err) {
    console.error("Create directory error:", err);
    res.status(500).json({ error: "Failed to create directory" });
  }
};

export const approveDirectory = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "admin") return res.status(403).json({ error: "Admin only" });

    const directoryId = Number(req.params.id);
    const directory = await prisma.supplierDirectory.update({
      where: { id: directoryId },
      data: {
        status: "APPROVED",
        isLiveEditable: true,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "DIRECTORY_APPROVED",
        entity: "SupplierDirectory",
        entityId: directory.id,
        userId: user.id,
      },
    });

    res.json(directory);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Approval failed" });
  }
};

export const getMyDirectoryById = async (req, res) => {
  try {
    const user = req.user;
    const directoryId = Number(req.params.id);

    if (user.role !== "recruiter") return res.status(403).json({ error: "Not allowed" });

    const directory = await prisma.supplierDirectory.findFirst({
      where: {
        id: directoryId,
        submittedById: user.id,
      },
    });

    if (!directory) return res.status(404).json({ error: "Directory not found" });

    // Ensure coverImageUrl is array
    let coverImageUrl = directory.coverImageUrl;
    if (typeof coverImageUrl === "string") {
      coverImageUrl = coverImageUrl ? [coverImageUrl] : [];
    } else if (!Array.isArray(coverImageUrl)) {
      coverImageUrl = [];
    }

    res.json({
      ...directory,
      coverImageUrl,
      manufacturingCapabilityImages: directory.manufacturingCapabilityImages || [],
      manufacturingCapabilityVideos: directory.manufacturingCapabilityVideos || [],
      machineryImages: directory.machineryImages || [],
    });
  } catch (err) {
    console.error("Get directory by id error:", err);
    res.status(500).json({ error: "Failed to load directory" });
  }
};

export const getProductListingEligibilityHandler = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" });
    }

    const eligibility = await getProductListingEligibility(user.companyId ?? null);
    res.json(eligibility);
  } catch (err) {
    console.error("Product listing eligibility error:", err);
    res.status(500).json({ error: "Failed to load product listing eligibility" });
  }
};

export const getMyDirectories = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "recruiter") return res.status(403).json({ error: "Not allowed" });

    if (user.companyId) {
      await prisma.supplierDirectory.updateMany({
        where: { submittedById: user.id, companyId: null },
        data: { companyId: user.companyId },
      });
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
    });

    const sanitizedDirectories = directories.map((dir) => {
      let coverImageUrl = dir.coverImageUrl;
      if (typeof coverImageUrl === "string") {
        coverImageUrl = coverImageUrl ? [coverImageUrl] : [];
      } else if (!Array.isArray(coverImageUrl)) {
        coverImageUrl = [];
      }

      return {
        id: dir.id,
        name: dir.name,
        slug: dir.slug,
        status: dir.status,
        isLiveEditable: dir.isLiveEditable,
        createdAt: dir.createdAt,
        logoUrl: dir.logoUrl,
        coverImageUrl,
        productSupplies: dir.productSupplies,
        videoGallery: dir.videoGallery,
        productGallery: dir.productGallery,
        companyGallery: dir.companyGallery,
        factoryGallery: dir.factoryGallery,
        productCatalogues: dir.productCatalogues,
        companyBrochure: dir.companyBrochure,
        certifications: dir.certifications,
        brandsRepresented: dir.brandsRepresented,
        industriesServed: dir.industriesServed,
        exportMarkets: dir.exportMarkets,
        manufacturingCapabilities: dir.manufacturingCapabilities,
        manufacturingCapabilityImages: dir.manufacturingCapabilityImages || [],
        manufacturingCapabilityVideos: dir.manufacturingCapabilityVideos || [],
        machineryList: dir.machineryList,
        machineryImages: dir.machineryImages || [],
        qualityStandards: dir.qualityStandards,
        enableInquiryForm: dir.enableInquiryForm,
        googleMapUrl: dir.googleMapUrl,
      };
    });

    res.json(sanitizedDirectories);
  } catch (err) {
    console.error("Get recruiter directories error:", err);
    res.status(500).json({ error: "Failed to load directories" });
  }
};

export const updateDirectory = async (req, res) => {
  try {
    const user = req.user;
    const directoryId = Number(req.params.id);

    const directory = await prisma.supplierDirectory.findUnique({
      where: { id: directoryId },
    });

    if (!directory) return res.status(404).json({ error: "Directory not found" });
    if (directory.submittedById !== user.id) return res.status(403).json({ error: "Not allowed" });
    if (!directory.isLiveEditable) return res.status(400).json({ error: "Directory not approved yet" });

    const {
      name,
      description,
      website,
      logoUrl,
      coverImageUrl,
      phoneNumber,
      email,
      googleMapUrl,

      tradeNames,
      socialLinks,

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
      manufacturingCapabilityImages,
      manufacturingCapabilityVideos,
      machineryList,
      machineryImages,
      qualityStandards,

      enableInquiryForm,

      productSupplies,

      slug,
    } = req.body;

    if (slug && slug !== directory.slug) return res.status(400).json({ error: "Slug cannot be changed" });

    // Get active subscription to check plan
    const activeSubscription = await getActiveSubscription(directory.companyId ?? user.companyId);
    const plan = activeSubscription?.plan || "free";

    // Sanitize cover images and social links
    let sanitizedMedia;
    try {
      let coverImages = [];
      if (Array.isArray(coverImageUrl)) {
        coverImages = coverImageUrl;
      } else if (typeof coverImageUrl === "string" && coverImageUrl) {
        coverImages = [coverImageUrl];
      }

      sanitizedMedia = await assertAndSanitizeSupplierDirectoryMedia(
        directory.companyId ?? user.companyId,
        {
          coverImages: coverImages,
          socialLinks,
        }
      );
    } catch (err) {
      return res.status(err.status || 403).json({
        error: err.message,
        code: err.code,
      });
    }

    // Check all other profile limits
    let profileEligibility;
    try {
      profileEligibility = await assertCompanyProfileLimits(
        directory.companyId ?? user.companyId,
        {
          description,
          googleMapUrl,
          productGallery,
          companyGallery,
          factoryGallery,
          videoGallery,
          productCatalogues,
          companyBrochure,
          certifications,
          brandsRepresented,
          industriesServed,
          exportMarkets,
          manufacturingCapabilities,
          manufacturingCapabilityImages,
          manufacturingCapabilityVideos,
          machineryList,
          machineryImages,
          qualityStandards,
          coverImages: sanitizedMedia.coverImages,
        }
      );
    } catch (err) {
      return res.status(err.status || 403).json({
        error: err.message,
        code: err.code,
        eligibility: err.eligibility,
      });
    }

    // Get configs
    const mfgConfig = getManufacturingCapabilitiesConfig(plan);
    const machineryConfig = getMachineryListConfig(plan);

    // Safety: null out features not allowed by package
    const isFeatureAllowed = (value) => {
      if (value === null || value === "Unlimited") return true;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.length > 0 && value !== "false";
      if (typeof value === 'number') return value > 0;
      return !!value;
    };

    const safeGoogleMapUrl = profileEligibility.googleMap ? googleMapUrl : null;
    const safeManufacturingCapabilities = mfgConfig.enabled ? manufacturingCapabilities : null;
    const safeManufacturingCapabilityImages = mfgConfig.hasImages ? manufacturingCapabilityImages : null;
    const safeManufacturingCapabilityVideos = mfgConfig.hasVideos ? manufacturingCapabilityVideos : null;
    const safeMachineryList = machineryConfig.enabled ? machineryList : null;
    const safeMachineryImages = machineryConfig.hasImages ? machineryImages : null;
    const safeQualityStandards = profileEligibility.qualityStandards ? qualityStandards : null;
    const safeExportMarkets = profileEligibility.exportMarkets ? exportMarkets : [];

    const updated = await prisma.supplierDirectory.update({
      where: { id: directoryId },
      data: {
        name,
        description,
        website,
        logoUrl,
        coverImageUrl: sanitizedMedia.coverImages,
        phoneNumber,
        email,
        googleMapUrl: safeGoogleMapUrl,
        tradeNames,
        socialLinks: sanitizedMedia.socialLinks,
        videoGallery,
        productGallery,
        companyGallery,
        factoryGallery,
        productCatalogues,
        companyBrochure,
        certifications,
        brandsRepresented,
        industriesServed,
        exportMarkets: safeExportMarkets,
        manufacturingCapabilities: safeManufacturingCapabilities,
        manufacturingCapabilityImages: safeManufacturingCapabilityImages,
        manufacturingCapabilityVideos: safeManufacturingCapabilityVideos,
        machineryList: safeMachineryList,
        machineryImages: safeMachineryImages,
        qualityStandards: safeQualityStandards,
        enableInquiryForm,
        productSupplies,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "DIRECTORY_UPDATED_LIVE",
        entity: "SupplierDirectory",
        entityId: updated.id,
        userId: user.id,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update directory error:", err);
    res.status(500).json({ error: "Update failed" });
  }
};

export const getCompanyProfileEligibilityHandler = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "recruiter") {
      return res.status(403).json({ error: "Not allowed" });
    }
    const eligibility = await getCompanyProfileEligibility(user.companyId ?? null);
    res.json(eligibility);
  } catch (err) {
    console.error("Company profile eligibility error:", err);
    res.status(500).json({ error: "Failed to load company profile eligibility" });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const {
      name,
      location,
      category,
      industryId,
      featured,
      page = "1",
      limit = "15",
      sort = "alphabetical",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    let industryIds = null;
    if (industryId) {
      industryIds = await getAllDescendantIndustryIds(Number(industryId));
    }

    const where = {
      status: "APPROVED",
      ...(name && {
        name: { contains: name },
      }),
      ...(location && {
        Company: {
          location: { contains: location },
        },
      }),
      ...(category && {
        OR: [
          { name: { contains: category } },
          { description: { contains: category } },
        ],
      }),
      ...(industryIds && {
        Company: {
          industryId: { in: industryIds },
        },
      }),
      ...(featured === "true" && {
        isFeatured: true,
      }),
    };

    const orderBy =
      sort === "newest" ? { createdAt: "desc" } :
        sort === "popular" ? { views: "desc" } :
          { name: "asc" };

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
              slug: true,
              location: true,
              industryId: true,
              Industry: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      data: suppliers,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("getSuppliers error:", err);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
};

export const getSupplierBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const supplier = await prisma.supplierDirectory.findUnique({
      where: { slug },
      include: {
        Company: {
          select: {
            id: true,
            name: true,
            slug: true,
            location: true,
            Industry: true,
            website: true,
          },
        },
      },
    });

    if (!supplier || supplier.status !== "APPROVED") {
      return res.status(404).json({ error: "Supplier not found" });
    }

    await prisma.supplierDirectory.update({
      where: { id: supplier.id },
      data: { views: { increment: 1 } },
    });

    const activeSubscription = await getActiveSubscription(supplier.companyId);
    const profileLimits = await getCompanyProfileEligibility(supplier.companyId);

    let coverImageUrl = supplier.coverImageUrl;
    if (typeof coverImageUrl === "string") {
      coverImageUrl = coverImageUrl ? [coverImageUrl] : [];
    } else if (!Array.isArray(coverImageUrl)) {
      coverImageUrl = [];
    }

    return res.json({
      ...supplier,
      coverImageUrl,
      googleMapUrl: supplier.googleMapUrl ?? null,
      planTier: activeSubscription.plan,
      subscription: activeSubscription,
      profileLimits,
      manufacturingCapabilityImages: supplier.manufacturingCapabilityImages || [],
      manufacturingCapabilityVideos: supplier.manufacturingCapabilityVideos || [],
      machineryImages: supplier.machineryImages || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch supplier" });
  }
};

export const getSupplierRfqEligibility = async (req, res) => {
  try {
    const { slug } = req.params;

    const supplier = await prisma.supplierDirectory.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    if (!supplier || supplier.status !== "APPROVED") {
      return res.status(404).json({ error: "Supplier not found" });
    }

    const eligibility = await getRfqLeadsEligibilityForSupplier(supplier.id);
    return res.json(eligibility);
  } catch (err) {
    console.error("Supplier RFQ eligibility error:", err);
    return res.status(500).json({ error: "Failed to load RFQ eligibility" });
  }
};

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
            subscriptionPlan: true,
            subscriptionExpiresAt: true,
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

    res.json(directories);
  } catch (err) {
    console.error("Admin fetch directories error:", err);
    res.status(500).json({ error: "Failed to fetch directories" });
  }
};

export const trackDirectoryConnection = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.supplierDirectory.update({
      where: { id: Number(id) },
      data: { connections: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Track connection error:", err);
    res.status(500).json({ error: "Failed to track connection" });
  }
};