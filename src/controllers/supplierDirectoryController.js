// controllers/supplierDirectoryController.js

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
import {
  normalizeGalleryArray,
  validateAndSanitizeGalleryArray,
  countGalleryItems,
} from "../lib/galleryUtils.js";

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

// Helper function to normalize gallery fields in response
function normalizeGalleryFields(directory) {
  return {
    ...directory,
    productGallery: normalizeGalleryArray(directory.productGallery),
    companyGallery: normalizeGalleryArray(directory.companyGallery),
    factoryGallery: normalizeGalleryArray(directory.factoryGallery),
  };
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

    // Validate gallery arrays
    const productGalleryValidation = validateAndSanitizeGalleryArray(productGallery);
    const companyGalleryValidation = validateAndSanitizeGalleryArray(companyGallery);
    const factoryGalleryValidation = validateAndSanitizeGalleryArray(factoryGallery);

    const allErrors = [
      ...productGalleryValidation.errors.map(e => `Product Gallery: ${e}`),
      ...companyGalleryValidation.errors.map(e => `Company Gallery: ${e}`),
      ...factoryGalleryValidation.errors.map(e => `Factory Gallery: ${e}`),
    ];

    if (allErrors.length > 0) {
      return res.status(400).json({
        error: "Gallery validation failed",
        details: allErrors,
      });
    }

    // Check all other profile limits
    let profileEligibility;
    try {
      profileEligibility = await assertCompanyProfileLimits(user.companyId, {
        description,
        googleMapUrl,
        productGallery: productGalleryValidation.data,
        companyGallery: companyGalleryValidation.data,
        factoryGallery: factoryGalleryValidation.data,
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

    // Create directory with validated gallery data
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
        productGallery: productGalleryValidation.data,
        companyGallery: companyGalleryValidation.data,
        factoryGallery: factoryGalleryValidation.data,
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

    res.status(201).json(normalizeGalleryFields(directory));
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

    res.json(normalizeGalleryFields(directory));
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
      ...normalizeGalleryFields(directory),
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

      const normalized = normalizeGalleryFields(dir);

      return {
        id: normalized.id,
        name: normalized.name,
        slug: normalized.slug,
        status: normalized.status,
        isLiveEditable: normalized.isLiveEditable,
        createdAt: normalized.createdAt,
        logoUrl: normalized.logoUrl,
        coverImageUrl,
        productSupplies: normalized.productSupplies,
        videoGallery: normalized.videoGallery,
        productGallery: normalized.productGallery,
        companyGallery: normalized.companyGallery,
        factoryGallery: normalized.factoryGallery,
        productCatalogues: normalized.productCatalogues,
        companyBrochure: normalized.companyBrochure,
        certifications: normalized.certifications,
        brandsRepresented: normalized.brandsRepresented,
        industriesServed: normalized.industriesServed,
        exportMarkets: normalized.exportMarkets,
        manufacturingCapabilities: normalized.manufacturingCapabilities,
        manufacturingCapabilityImages: normalized.manufacturingCapabilityImages || [],
        manufacturingCapabilityVideos: normalized.manufacturingCapabilityVideos || [],
        machineryList: normalized.machineryList,
        machineryImages: normalized.machineryImages || [],
        qualityStandards: normalized.qualityStandards,
        enableInquiryForm: normalized.enableInquiryForm,
        googleMapUrl: normalized.googleMapUrl,
      };
    });

    res.json(sanitizedDirectories);
  } catch (err) {
    console.error("Get recruiter directories error:", err);
    res.status(500).json({ error: "Failed to load directories" });
  }
};

// controllers/supplierDirectoryController.js

// controllers/supplierDirectoryController.js

export const updateDirectory = async (req, res) => {
  try {
    const user = req.user;
    const directoryId = Number(req.params.id);

    console.log("=== UPDATE DIRECTORY ===");
    console.log("User:", user.id, user.role);
    console.log("Directory ID:", directoryId);

    const directory = await prisma.supplierDirectory.findUnique({
      where: { id: directoryId },
    });

    if (!directory) {
      console.log("Directory not found");
      return res.status(404).json({ error: "Directory not found" });
    }

    console.log("Directory found:", {
      id: directory.id,
      submittedById: directory.submittedById,
      isLiveEditable: directory.isLiveEditable,
      status: directory.status
    });

    // Check if user owns this directory
    if (directory.submittedById !== user.id) {
      console.log("User does not own this directory:", {
        submittedById: directory.submittedById,
        userId: user.id
      });
      return res.status(403).json({ error: "Not allowed - You don't own this directory" });
    }

    // Check if directory is editable
    if (!directory.isLiveEditable) {
      console.log("Directory is not live editable");
      return res.status(400).json({ error: "Directory not approved yet - Please wait for admin approval" });
    }

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

    // Optional: Allow only specific fields to be updated
    // Remove any fields that shouldn't be updated
    if (slug && slug !== directory.slug) {
      return res.status(400).json({ error: "Slug cannot be changed" });
    }

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
          coverImages: coverImages || [],
          socialLinks: socialLinks || {},
        }
      );
    } catch (err) {
      console.error("Media sanitization error:", err);
      return res.status(err.status || 403).json({
        error: err.message,
        code: err.code,
      });
    }

    // Validate gallery arrays - support partial updates (only provided fields)
    let productGalleryValidation = null;
    let companyGalleryValidation = null;
    let factoryGalleryValidation = null;

    // Normalize incoming gallery data - FIXED: removed TypeScript syntax
    function normalizeIncomingGallery(gallery) {
      if (!Array.isArray(gallery)) return gallery;
      return gallery.map(function (item) {
        if (typeof item === 'string') {
          return { image: item, name: "", description: "" };
        }
        return {
          image: item?.image || "",
          name: item?.name || "",
          description: item?.description || ""
        };
      });
    }

    if (productGallery !== undefined) {
      const normalized = normalizeIncomingGallery(productGallery);
      productGalleryValidation = validateAndSanitizeGalleryArray(normalized);
    }
    if (companyGallery !== undefined) {
      const normalized = normalizeIncomingGallery(companyGallery);
      companyGalleryValidation = validateAndSanitizeGalleryArray(normalized);
    }
    if (factoryGallery !== undefined) {
      const normalized = normalizeIncomingGallery(factoryGallery);
      factoryGalleryValidation = validateAndSanitizeGalleryArray(normalized);
    }

    // Check gallery validation errors
    const allErrors = [];
    if (productGalleryValidation && productGalleryValidation.errors.length > 0) {
      allErrors.push({ field: 'productGallery', errors: productGalleryValidation.errors });
    }
    if (companyGalleryValidation && companyGalleryValidation.errors.length > 0) {
      allErrors.push({ field: 'companyGallery', errors: companyGalleryValidation.errors });
    }
    if (factoryGalleryValidation && factoryGalleryValidation.errors.length > 0) {
      allErrors.push({ field: 'factoryGallery', errors: factoryGalleryValidation.errors });
    }

    if (allErrors.length > 0) {
      return res.status(400).json({
        error: "Gallery validation failed",
        details: allErrors,
      });
    }

    // Get configs
    const mfgConfig = getManufacturingCapabilitiesConfig(plan);
    const machineryConfig = getMachineryListConfig(plan);

    // Build update data - only include fields that are provided
    const updateData = {};

    // Only add fields if they exist in the request
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (website !== undefined) updateData.website = website;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (email !== undefined) updateData.email = email;
    if (tradeNames !== undefined) updateData.tradeNames = tradeNames;
    if (videoGallery !== undefined) updateData.videoGallery = videoGallery;
    if (productSupplies !== undefined) updateData.productSupplies = productSupplies;
    if (productCatalogues !== undefined) updateData.productCatalogues = productCatalogues;
    if (companyBrochure !== undefined) updateData.companyBrochure = companyBrochure;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (brandsRepresented !== undefined) updateData.brandsRepresented = brandsRepresented;
    if (industriesServed !== undefined) updateData.industriesServed = industriesServed;
    if (enableInquiryForm !== undefined) updateData.enableInquiryForm = enableInquiryForm;

    // Social links with sanitization
    if (socialLinks !== undefined) {
      updateData.socialLinks = sanitizedMedia.socialLinks;
    }

    // Cover images
    if (coverImageUrl !== undefined) {
      updateData.coverImageUrl = sanitizedMedia.coverImages;
    }

    // Google Map - check if allowed by plan
    if (googleMapUrl !== undefined) {
      const profileEligibility = await getCompanyProfileEligibility(directory.companyId ?? user.companyId);
      updateData.googleMapUrl = profileEligibility.googleMap ? googleMapUrl : null;
    }

    // Export Markets
    if (exportMarkets !== undefined) {
      const profileEligibility = await getCompanyProfileEligibility(directory.companyId ?? user.companyId);
      updateData.exportMarkets = profileEligibility.exportMarkets ? exportMarkets : [];
    }

    // Manufacturing Capabilities
    if (manufacturingCapabilities !== undefined) {
      updateData.manufacturingCapabilities = mfgConfig.enabled ? manufacturingCapabilities : null;
    }
    if (manufacturingCapabilityImages !== undefined) {
      updateData.manufacturingCapabilityImages = mfgConfig.hasImages ? manufacturingCapabilityImages : null;
    }
    if (manufacturingCapabilityVideos !== undefined) {
      updateData.manufacturingCapabilityVideos = mfgConfig.hasVideos ? manufacturingCapabilityVideos : null;
    }

    // Machinery List
    if (machineryList !== undefined) {
      updateData.machineryList = machineryConfig.enabled ? machineryList : null;
    }
    if (machineryImages !== undefined) {
      updateData.machineryImages = machineryConfig.hasImages ? machineryImages : null;
    }

    // Quality Standards
    if (qualityStandards !== undefined) {
      const profileEligibility = await getCompanyProfileEligibility(directory.companyId ?? user.companyId);
      updateData.qualityStandards = profileEligibility.qualityStandards ? qualityStandards : null;
    }

    // Gallery fields with validation
    if (productGalleryValidation && productGalleryValidation.data) {
      // Check limits
      const profileEligibility = await getCompanyProfileEligibility(directory.companyId ?? user.companyId);
      const productLimit = profileEligibility.productImages;
      if (productLimit !== null && productGalleryValidation.data.length > productLimit) {
        return res.status(403).json({
          error: `Only ${productLimit} product images are allowed on the ${profileEligibility.planLabel} plan.`,
          code: "PRODUCT_IMAGE_LIMIT_REACHED",
        });
      }
      updateData.productGallery = productGalleryValidation.data;
    }

    if (companyGalleryValidation && companyGalleryValidation.data) {
      const profileEligibility = await getCompanyProfileEligibility(directory.companyId ?? user.companyId);
      const galleryLimit = profileEligibility.galleryImages;
      if (galleryLimit !== null && companyGalleryValidation.data.length > galleryLimit) {
        return res.status(403).json({
          error: `Only ${galleryLimit} company gallery images are allowed on the ${profileEligibility.planLabel} plan.`,
          code: "COMPANY_GALLERY_LIMIT_REACHED",
        });
      }
      updateData.companyGallery = companyGalleryValidation.data;
    }

    if (factoryGalleryValidation && factoryGalleryValidation.data) {
      const profileEligibility = await getCompanyProfileEligibility(directory.companyId ?? user.companyId);
      const factoryLimit = profileEligibility.factoryImages;
      if (factoryLimit !== null && factoryGalleryValidation.data.length > factoryLimit) {
        return res.status(403).json({
          error: `Only ${factoryLimit} factory images are allowed on the ${profileEligibility.planLabel} plan.`,
          code: "FACTORY_GALLERY_LIMIT_REACHED",
        });
      }
      updateData.factoryGallery = factoryGalleryValidation.data;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    console.log("Update data:", JSON.stringify(updateData, null, 2));

    const updated = await prisma.supplierDirectory.update({
      where: { id: directoryId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        action: "DIRECTORY_UPDATED_LIVE",
        entity: "SupplierDirectory",
        entityId: updated.id,
        userId: user.id,
      },
    });

    // Return normalized data
    res.json(normalizeGalleryFields(updated));
  } catch (err) {
    console.error("Update directory error:", err);
    res.status(500).json({
      error: "Update failed",
      details: err.message
    });
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

    // Normalize gallery fields for each supplier
    const normalizedSuppliers = suppliers.map(supplier => normalizeGalleryFields(supplier));

    res.json({
      data: normalizedSuppliers,
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

    const normalized = normalizeGalleryFields(supplier);

    return res.json({
      ...normalized,
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

    const normalized = directories.map(dir => normalizeGalleryFields(dir));
    res.json(normalized);
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