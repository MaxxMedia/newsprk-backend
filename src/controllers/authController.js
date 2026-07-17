// src/controllers/authController.js

import prisma from "../prismaClient.js"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const MAIL_FROM = process.env.MAIL_FROM

const JWT_SECRET = process.env.JWT_SECRET || "changeme"
const SALT_ROUNDS = 12

/* ================= PASSWORD VALIDATION ================= */

const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString()

const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex")

/* ================= REGISTER ================= */

export const register = async (req, res) => {
  try {
    const { email, password, role } = req.body

    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" })

    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must be 8+ chars with uppercase, lowercase, number, symbol",
      })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing)
      return res.status(409).json({ error: "User already exists" })

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    const otp = generateOtp()
    const otpHash = hashValue(otp)
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000)

    const username =
      email.split("@")[0] + "_" + Date.now().toString().slice(-5)

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role === "recruiter" ? "recruiter" : "candidate",
        username,
        otpHash,
        otpExpiry,
      },
    })

    await resend.emails.send({
      from: `MoldMaking Technology <${MAIL_FROM}>`,
      to: email,
      subject: "Verify Your Email",
      html: `
        <h2>Email Verification</h2>
        <p>Your OTP:</p>
        <h1 style="letter-spacing:4px">${otp}</h1>
        <p>Expires in 10 minutes.</p>
      `,
    })

    res.status(201).json({ message: "OTP sent to email" })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Registration failed" })
  }
}

/* ================= VERIFY OTP ================= */

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.otpHash)
      return res.status(400).json({ error: "Invalid request" })

    if (user.otpExpiry < new Date())
      return res.status(400).json({ error: "OTP expired" })

    if (hashValue(otp) !== user.otpHash)
      return res.status(400).json({ error: "Invalid OTP" })

    await prisma.user.update({
      where: { email },
      data: {
        emailVerified: true,
        otpHash: null,
        otpExpiry: null,
      },
    })

    res.json({ message: "Email verified successfully" })
  } catch {
    res.status(500).json({ error: "Verification failed" })
  }
}

/* ================= RESEND OTP ================= */

export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: "User not found" })

    if (user.emailVerified)
      return res.status(400).json({ error: "Already verified" })

    const otp = generateOtp()

    await prisma.user.update({
      where: { email },
      data: {
        otpHash: hashValue(otp),
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    await resend.emails.send({
      from: `MoldMaking Technology <${MAIL_FROM}>`,
      to: email,
      subject: "Resend OTP",
      html: `<h2>Your new OTP: ${otp}</h2>`,
    })

    res.json({ message: "OTP resent successfully" })
  } catch {
    res.status(500).json({ error: "Failed to resend OTP" })
  }
}

/* ================= LOGIN ================= */

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        Company: true,
      },
    })
    if (!user)
      return res.status(401).json({ error: "Invalid credentials" })

    if (user.lockUntil && user.lockUntil > new Date())
      return res.status(403).json({ error: "Account locked temporarily" })

    if (!user.emailVerified)
      return res.status(403).json({ error: "Verify your email first" })

    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {
      const attempts = user.failedLoginAttempts + 1

      if (attempts >= 5) {
        await prisma.user.update({
          where: { email },
          data: {
            failedLoginAttempts: 0,
            lockUntil: new Date(Date.now() + 15 * 60 * 1000),
          },
        })
        return res.status(403).json({
          error: "Account locked for 15 minutes",
        })
      }

      await prisma.user.update({
        where: { email },
        data: { failedLoginAttempts: attempts },
      })

      return res.status(401).json({ error: "Invalid credentials" })
    }

    await prisma.user.update({
      where: { email },
      data: { failedLoginAttempts: 0, lockUntil: null },
    })

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        email: user.email,
        companyId: user.companyId,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    )

    // ✅ Check if user has ANY PAID package purchase
    const packagePurchase = await prisma.packagePurchase.findFirst({
      where: {
        userId: user.id,
        status: "PAID",
      },
    })

    const packageSelected = !!packagePurchase

    // ✅ Get the actual subscription plan from Company (source of truth)
    const subscriptionPlan = user.Company?.subscriptionPlan || "free"

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
        isOnboarded: user.isOnboarded || false,
        companyId: user.companyId ?? null,
        packageSelected: packageSelected,
        subscriptionPlan: subscriptionPlan,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Login failed" })
  }
}

/* ================= ME (live refresh, no re-login needed) ================= */
/*
  ✅ NEW: this endpoint is the fix for stale localStorage.
  The frontend calls this right after payment success, right after
  onboarding/company-creation, and on every protected-route mount,
  so packageSelected / subscriptionPlan are never stale.
*/
export const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { Company: true },
    })

    if (!user) return res.status(404).json({ error: "User not found" })

    const packagePurchase = await prisma.packagePurchase.findFirst({
      where: { userId: user.id, status: "PAID" },
    })

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      isOnboarded: user.isOnboarded || false,
      companyId: user.companyId ?? null,
      packageSelected: !!packagePurchase,
      subscriptionPlan: user.Company?.subscriptionPlan || "free",
    })
  } catch (err) {
    console.error("Me endpoint error:", err)
    res.status(500).json({ error: "Failed to load user" })
  }
}

/* ================= FORGOT PASSWORD ================= */

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: "User not found" })

    const otp = generateOtp()

    await prisma.user.update({
      where: { email },
      data: {
        resetOtpHash: hashValue(otp),
        resetOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    await resend.emails.send({
      from: `MoldMaking Technology <${MAIL_FROM}>`,
      to: email,
      subject: "Password Reset OTP",
      html: `<h2>Your reset OTP: ${otp}</h2>`,
    })

    res.json({ message: "Reset OTP sent" })
  } catch {
    res.status(500).json({ error: "Failed to send reset OTP" })
  }
}

/* ================= RESET PASSWORD ================= */

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.resetOtpHash)
      return res.status(400).json({ error: "Invalid request" })

    if (user.resetOtpExpiry < new Date())
      return res.status(400).json({ error: "OTP expired" })

    if (hashValue(otp) !== user.resetOtpHash)
      return res.status(400).json({ error: "Invalid OTP" })

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetOtpHash: null,
        resetOtpExpiry: null,
      },
    })

    res.json({ message: "Password reset successful" })
  } catch {
    res.status(500).json({ error: "Reset failed" })
  }
}