import { body, validationResult } from "express-validator";

// Parses a JSON-stringified array (as sent via multipart/form-data)
// into a real array before validation runs. If the value is already
// an array (e.g. JSON request body), it's left untouched.
function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value; // let isArray() fail it below if not actually an array
    } catch {
      return value; // invalid JSON string, let isArray() fail it below
    }
  }
  return value;
}

export const validateIndustryTalk = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title cannot exceed 255 characters"),

  body("guestName")
    .trim()
    .notEmpty()
    .withMessage("Guest name is required")
    .isLength({ max: 255 }),

  body("interviewType")
    .optional()
    .isString(),

  body("categoryId")
    .optional()
    .isInt(),

  body("industryId")
    .optional()
    .isInt(),

  body("videoType")
    .optional()
    .isIn(["youtube", "vimeo", "upload"])
    .withMessage("Invalid video type"),

  body("videoUrl")
    .optional()
    .isURL()
    .withMessage("Invalid video URL"),

  body("website")
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage("Invalid website URL"),

  body("linkedinUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage("Invalid LinkedIn URL"),

  body("status")
    .optional()
    .isIn(["DRAFT", "PUBLISHED", "ARCHIVED", "PENDING", "REJECTED"]),

  body("featured")
    .optional()
    .isBoolean(),

  body("trending")
    .optional()
    .isBoolean(),

  body("homepage")
    .optional()
    .isBoolean(),

  body("questions")
    .optional()
    .customSanitizer(parseJsonArray)
    .isArray()
    .withMessage("Questions must be an array"),

  body("quotes")
    .optional()
    .customSanitizer(parseJsonArray)
    .isArray()
    .withMessage("Quotes must be an array"),

  body("gallery")
    .optional()
    .customSanitizer(parseJsonArray)
    .isArray()
    .withMessage("Gallery must be an array"),

  body("documents")
    .optional()
    .customSanitizer(parseJsonArray)
    .isArray()
    .withMessage("Documents must be an array"),

  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        errors: errors.array(),
      });
    }

    next();
  },
];