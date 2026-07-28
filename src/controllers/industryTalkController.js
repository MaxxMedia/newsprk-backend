import * as industryTalkService from "../services/industryTalkService.js";

// ================================
// Helpers
// ================================

// multipart/form-data delivers every field as a string. Prisma needs
// real types (Int, Boolean) for the corresponding schema fields, so
// coerce them here before they reach the service/Prisma layer.
function normalizeIndustryTalkBody(body) {
  const normalized = { ...body };

  // Int fields — empty string / undefined -> null, otherwise parseInt
  for (const field of ["industryId", "categoryId"]) {
    if (normalized[field] === "" || normalized[field] === undefined) {
      normalized[field] = null;
    } else if (typeof normalized[field] === "string") {
      const parsed = parseInt(normalized[field], 10);
      normalized[field] = Number.isNaN(parsed) ? null : parsed;
    }
  }

  // Boolean fields — "true"/"false" strings -> real booleans
  for (const field of ["featured", "trending", "homepage", "autoplay", "showControls"]) {
    if (typeof normalized[field] === "string") {
      normalized[field] = normalized[field] === "true";
    }
  }

  // duration comes from the frontend as "mm:ss" (e.g. "18:45").
  // Prisma's `duration` column is Int (seconds) — convert here.
  if (typeof normalized.duration === "string") {
    normalized.duration = parseDurationToSeconds(normalized.duration);
  }

  return normalized;
}

// "18:45" -> 1125 (seconds). "1:02:30" -> 3750. "" or malformed -> null.
function parseDurationToSeconds(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

// ================================
// Create Industry Talk
// ================================
export const createIndustryTalk = async (req, res) => {
  try {
    const talk = await industryTalkService.createIndustryTalk({
      ...normalizeIndustryTalkBody(req.body),
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Industry Talk created successfully.",
      data: talk,
    });
  } catch (error) {
    console.error("Create Industry Talk:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Update Industry Talk
// ================================
export const updateIndustryTalk = async (req, res) => {
  try {
    const { id } = req.params;

    const talk = await industryTalkService.updateIndustryTalk(
      id,
      normalizeIndustryTalkBody(req.body)
    );

    return res.json({
      success: true,
      message: "Industry Talk updated successfully.",
      data: talk,
    });
  } catch (error) {
    console.error("Update Industry Talk:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Delete Industry Talk
// ================================
export const deleteIndustryTalk = async (req, res) => {
  try {
    const { id } = req.params;

    await industryTalkService.deleteIndustryTalk(id);

    return res.json({
      success: true,
      message: "Industry Talk deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Get All Industry Talks
// ================================
export const getIndustryTalks = async (req, res) => {
  try {
    const data = await industryTalkService.getIndustryTalks({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      search: req.query.search,
      status: req.query.status,
    });

    return res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Get By Id
// ================================
export const getIndustryTalkById = async (req, res) => {
  try {
    const talk = await industryTalkService.getIndustryTalkById(
      req.params.id
    );

    if (!talk) {
      return res.status(404).json({
        success: false,
        message: "Industry Talk not found.",
      });
    }

    return res.json({
      success: true,
      data: talk,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Get By Slug
// ================================
export const getIndustryTalkBySlug = async (req, res) => {
  try {
    const talk =
      await industryTalkService.getIndustryTalkBySlug(
        req.params.slug
      );

    if (!talk) {
      return res.status(404).json({
        success: false,
        message: "Industry Talk not found.",
      });
    }

    return res.json({
      success: true,
      data: talk,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Publish
// ================================
export const publishIndustryTalk = async (req, res) => {
  try {
    const talk =
      await industryTalkService.publishIndustryTalk(
        req.params.id,
        req.user.id
      );

    return res.json({
      success: true,
      message: "Industry Talk published.",
      data: talk,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Save Draft
// ================================
export const saveDraftIndustryTalk = async (req, res) => {
  try {
    const talk =
      await industryTalkService.saveDraft(req.params.id);

    return res.json({
      success: true,
      message: "Saved as draft.",
      data: talk,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Increment Views
// ================================
export const incrementIndustryTalkView = async (
  req,
  res
) => {
  try {
    await industryTalkService.incrementViews(req.params.id);

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ================================
// Increment Shares
// ================================
export const incrementIndustryTalkShare = async (
  req,
  res
) => {
  try {
    await industryTalkService.incrementShares(req.params.id);

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};