import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ----------------------------
// Memory storage
// ----------------------------
const storage = multer.memoryStorage();

// ----------------------------
// Resume Upload (PDF)
// ----------------------------
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed."));
    }
  },
});

// ----------------------------
// Banner / Image Upload
// ----------------------------
export const uploadImage = [
  multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed."));
      }
    },
  }).single("image"),

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No image uploaded",
        });
      }

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "mould-tech/images",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });

      res.json({
        imageUrl: result.secure_url,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Image upload failed",
      });
    }
  },
];

// ----------------------------
// ✅ NEW: Document Upload (PDF, Word, Excel, etc.)
// ----------------------------
export const uploadDocument = [
  multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only document files (PDF, Word, Excel, PowerPoint) are allowed."));
      }
    },
  }).single("document"), // ✅ Changed field name to "document"

  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No document uploaded",
        });
      }

      // Get original file extension
      const originalName = req.file.originalname.split(".")[0];
      const extension = req.file.originalname.split(".").pop();

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "mould-tech/documents",
            resource_type: "auto", // ✅ Auto-detect file type
            public_id: `${originalName}-${Date.now()}`,
            format: extension,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });

      res.json({
        documentUrl: result.secure_url,
        publicId: result.public_id,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Document upload failed",
      });
    }
  },
];

// ----------------------------
// Resume Upload Helper
// ----------------------------
export async function uploadResumeToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const originalName = file.originalname.split(".")[0];
    const extension = file.originalname.split(".").pop();

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "mould-tech/resumes",
        resource_type: "raw",
        public_id: `${originalName}-${Date.now()}`,
        format: extension,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

// ----------------------------
// ✅ NEW: Delete file from Cloudinary
// ----------------------------
export const deleteFile = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: "Public ID is required" });
    }

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return res.json({ message: "File deleted successfully" });
    } else {
      return res.status(400).json({ error: "Failed to delete file" });
    }
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

// ----------------------------
// ✅ NEW: Upload multiple documents
// ----------------------------
export const uploadMultipleDocuments = [
  multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only document files are allowed."));
      }
    },
  }).array("documents", 5), // Max 5 documents

  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: "No documents uploaded",
        });
      }

      const uploadPromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const originalName = file.originalname.split(".")[0];
          const extension = file.originalname.split(".").pop();

          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "mould-tech/documents",
              resource_type: "auto",
              public_id: `${originalName}-${Date.now()}`,
              format: extension,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );

          stream.end(file.buffer);
        });
      });

      const results = await Promise.all(uploadPromises);

      const documentUrls = results.map((result) => ({
        documentUrl: result.secure_url,
        publicId: result.public_id,
      }));

      res.json({
        documents: documentUrls,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        error: "Document upload failed",
      });
    }
  },
];
// ----------------------------
// ✅ NEW: Generic Cloudinary upload helper (image or raw/document)
// Reusable from any controller — not tied to a specific route/field name.
// ----------------------------
export async function uploadBufferToCloudinary(file, { folder, resourceType = "image" }) {
  return new Promise((resolve, reject) => {
    const originalName = file.originalname.split(".")[0];
    const extension = file.originalname.split(".").pop();

    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType, // "image" | "raw" | "auto"
        public_id: `${originalName}-${Date.now()}`,
        ...(resourceType !== "image" && { format: extension }),
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}

export async function uploadEventImageToCloudinary(file) {
  return uploadBufferToCloudinary(file, {
    folder: "mould-tech/events/images",
    resourceType: "image",
  });
}

export async function uploadEventDocumentToCloudinary(file) {
  return uploadBufferToCloudinary(file, {
    folder: "mould-tech/events/documents",
    resourceType: "auto",
  });
}

// ----------------------------
// ✅ NEW: Multer instance for the Add Event form
// Your existing `upload` instance rejects everything except PDFs (it was
// built for resumes), so it can't be reused for logo/banner/otherImages
// (images) + brochure (PDF/doc) in the same .fields() call. This instance
// checks allowed mimetypes per-fieldname instead of one blanket rule.
// ----------------------------
const EVENT_IMAGE_FIELDS = ["logo", "banner", "otherImages"];
const EVENT_DOCUMENT_FIELDS = ["brochure"];

export const uploadEventFiles = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
  fileFilter: (req, file, cb) => {
    if (EVENT_IMAGE_FIELDS.includes(file.fieldname)) {
      if (file.mimetype.startsWith("image/")) {
        return cb(null, true);
      }
      return cb(new Error(`${file.fieldname} must be an image file (PNG/JPG/WEBP).`));
    }

    if (EVENT_DOCUMENT_FIELDS.includes(file.fieldname)) {
      const allowedDocTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (allowedDocTypes.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error(`${file.fieldname} must be a PDF or Word document.`));
    }

    cb(new Error(`Unexpected file field: ${file.fieldname}`));
  },
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
  { name: "brochure", maxCount: 1 },
  { name: "otherImages", maxCount: 10 },
]);