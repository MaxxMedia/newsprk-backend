// routes/quoteRoutes.js
import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { createQuoteRequest, getSupplierQuotes } from "../controllers/Quotecontroller.js";

const router = express.Router();

// Protected route - get quotes for a specific supplier
router.get("/supplier/:supplierId", requireAuth, getSupplierQuotes);

export default router;
