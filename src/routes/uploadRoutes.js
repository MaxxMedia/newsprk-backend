import express from "express";
import {
    uploadImage,
    uploadDocument,
    deleteFile,
    uploadMultipleDocuments,
    uploadIndustryTalk
} from "../controllers/uploadController.js";
import { uploadIndustryTalkFiles } from "../middleware/uploadIndustryTalk.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// ✅ Image upload
router.post("/", uploadImage);

// ✅ Document upload (PDF, Word, Excel, etc.)
router.post("/document", uploadDocument);

// ✅ Multiple documents upload
router.post("/documents", uploadMultipleDocuments);

router.post("/document", requireAuth, ...uploadDocument)

// ✅ Delete file
router.delete("/", deleteFile);

router.post(
  "/industry-talk",
  requireAuth,
  uploadIndustryTalkFiles,
  uploadIndustryTalk
);

export default router;