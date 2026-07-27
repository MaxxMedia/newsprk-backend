import { body, validationResult } from "express-validator";

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
    .isArray(),

  body("quotes")
    .optional()
    .isArray(),

  body("gallery")
    .optional()
    .isArray(),

  body("documents")
    .optional()
    .isArray(),

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