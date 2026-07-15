import express from "express"
import {
  getSuppliers,
  getSupplierShowroom,
  getSupplierRfqEligibility, // add this export to publicSupplierController.js — see below
} from "../controllers/publicSupplierController.js"
 
const router = express.Router()
 
router.get("/", getSuppliers)
router.get("/:slug/rfq-eligibility", getSupplierRfqEligibility) // must come before "/:slug"? No — different path shape, order-safe either way, but keep above for readability
router.get("/:slug", getSupplierShowroom)
 
export default router