import multer from "multer";
import path from "path";
import fs from "fs";

// Create upload directory if it doesn't exist
const uploadDir = "src/uploads/excel";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    const ext = path.extname(file.originalname);

    const fileName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      ext;

    cb(null, fileName);
  },
});

// Allow only Excel / CSV
const fileFilter = (req, file, cb) => {
  const allowed = [
    ".xlsx",
    ".xls",
    ".csv",
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowed.includes(ext)) {
    return cb(
      new Error(
        "Only Excel (.xlsx, .xls) and CSV files are allowed."
      )
    );
  }

  cb(null, true);
};

export const uploadExcel = multer({
  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});