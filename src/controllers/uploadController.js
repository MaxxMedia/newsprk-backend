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