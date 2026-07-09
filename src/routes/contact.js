import express from "express";
import {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact
} from "../controllers/contactController.js";

const router = express.Router();

// Public routes
router.post("/", createContact);

// Admin routes (you might want to add authentication middleware here)
router.get("/", getAllContacts);
router.get("/:id", getContactById);
router.patch("/:id/status", updateContactStatus);
router.delete("/:id", deleteContact);

export default router;