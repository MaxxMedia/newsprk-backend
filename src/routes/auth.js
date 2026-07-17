import express from "express"
import rateLimit from "express-rate-limit"
import { requireAuth } from "../middleware/auth.js"

import {
  register,
  login,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  me, // ✅ NEW
} from "../controllers/authController.js"

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many login attempts. Try again later.",
})

router.post("/register", register)
router.post("/verify-otp", verifyOtp)
router.post("/resend-otp", resendOtp)
router.post("/login", loginLimiter, login)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)

// ✅ NEW: live user/subscription refresh, no re-login required
router.get("/me", requireAuth, me)

export default router