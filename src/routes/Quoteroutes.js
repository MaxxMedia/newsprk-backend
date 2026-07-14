import express from "express";
import { createQuoteRequest } from "../controllers/quoteController.js";

const router = express.Router();

// POST /api/suppliers/:slug/quote-request
router.post("/:slug/quote-request", createQuoteRequest);

export default router;