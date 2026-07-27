import multer from "multer";

const storage = multer.memoryStorage();

const IMAGE_FIELDS = [
  "banner",
  "companyLogo",
  "profileImage",
  "thumbnail",
  "gallery",
];

const VIDEO_FIELDS = [
  "video",
];

const DOCUMENT_FIELDS = [
  "documents",
];

const IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const VIDEO_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const uploadIndustryTalkFiles = multer({
  storage,

  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },

  fileFilter: (req, file, cb) => {
    // Images
    if (IMAGE_FIELDS.includes(file.fieldname)) {
      if (IMAGE_TYPES.includes(file.mimetype)) {
        return cb(null, true);
      }

      return cb(
  new Error(
    `${file.fieldname} only accepts PDF, Word, Excel or PowerPoint documents.`
  )
);
    }

    // Video
    if (VIDEO_FIELDS.includes(file.fieldname)) {
      if (VIDEO_TYPES.includes(file.mimetype)) {
        return cb(null, true);
      }

      return cb(
        new Error(`${file.fieldname} only accepts MP4/MOV/AVI/MKV videos.`)
      );
    }

    // Documents
    if (DOCUMENT_FIELDS.includes(file.fieldname)) {
      if (DOCUMENT_TYPES.includes(file.mimetype)) {
        return cb(null, true);
      }

      return cb(
        new Error(`${file.fieldname} only accepts PDF or Word documents.`)
      );
    }

    return cb(new Error(`Unexpected upload field: ${file.fieldname}`));
  },
}).fields([
  {
    name: "banner",
    maxCount: 1,
  },
  {
    name: "companyLogo",
    maxCount: 1,
  },
  {
    name: "profileImage",
    maxCount: 1,
  },
  {
    name: "thumbnail",
    maxCount: 1,
  },
  {
    name: "video",
    maxCount: 1,
  },
  {
    name: "gallery",
    maxCount: 20,
  },
  {
    name: "documents",
    maxCount: 20,
  },
]);