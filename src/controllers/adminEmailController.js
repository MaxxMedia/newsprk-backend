// C:\Users\Dell\OneDrive\Desktop\tooling\newsprk-backend\src\controllers\adminEmailController.js

import { Resend } from "resend"
import prisma from "../prismaClient.js"
import bcrypt from "bcrypt"
import { sendRecruiterEmail } from "../../utils/resendEmail.js"

const resend = new Resend(process.env.RESEND_API_KEY)

function generateRandomPassword(length = 12) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!%"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function sendBulkImportEmail(req, res) {
  if (req.user.role?.toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Admin only" })
  }

  const { userId } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        Company: true,  // ✅ Changed from "company" to "Company" (capital C)
      },
    })

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    if (user.emailSentForBulkImport) {
      return res.status(400).json({
        error: "Email already sent to this user",
      })
    }

    if (user.isOnboarded || user.lastLoginAt) {
      return res.status(400).json({
        error: "User already onboarded or logged in, email not required",
      })
    }

    const plainPassword = generateRandomPassword()
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        emailSentForBulkImport: true,
      },
    })

    await sendRecruiterEmail(
      user.email,
      user.username,
      plainPassword
    )

    res.json({
      message: "Email sent successfully",
      userId: user.id,
      email: user.email,
    })

  } catch (error) {
    console.error("Send email error:", error)
    res.status(500).json({
      error: error.message || "Failed to send email",
    })
  }
}