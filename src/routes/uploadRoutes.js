import express from "express";
import {
    uploadImage,
    uploadDocument,
    deleteFile,
    uploadMultipleDocuments
} from "../controllers/uploadController.js";

const router = express.Router();

// ✅ Image upload
router.post("/", uploadImage);

// ✅ Document upload (PDF, Word, Excel, etc.)
router.post("/document", uploadDocument);

// ✅ Multiple documents upload
router.post("/documents", uploadMultipleDocuments);

// ✅ Delete file
router.delete("/", deleteFile);

export default router;