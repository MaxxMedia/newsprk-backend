import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma.js"

const JWT_SECRET = process.env.JWT_SECRET || "changeme"

/*
  ✅ ROOT-CAUSE FIX

  Previously req.user.companyId (and role) came straight from the JWT
  payload, which is baked in at login time and never changes for the
  life of the token (up to 7 days). In this app's flow — Signup → OTP →
  Package Selection → Payment → Onboarding → Dashboard — login happens
  BEFORE the Company is created during onboarding. That means every
  request made after payment (feature limits, directory creation,
  eligibility checks, dashboard data) was reading companyId: null from
  the stale token, which made getActiveSubscription() and every limit
  check silently fall back to "free" — no matter what plan was actually
  purchased — until the user logged out and back in.

  Fix: only trust the JWT for the user's identity (id). Re-fetch
  companyId, role, and isOnboarded from the database on every
  authenticated request. This is one extra indexed lookup per request
  (cheap) and permanently closes this class of bug everywhere
  req.user is used — payments, articles, team limits, supplier
  directories, jobs, etc. — not just in one controller.
*/
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization
    if (!header) {
      return res.status(401).json({ error: "Authorization header required" })
    }

    const [type, token] = header.split(" ")
    if (type !== "Bearer" || !token) {
      return res.status(401).json({ error: "Invalid auth format" })
    }

    const payload = jwt.verify(token, JWT_SECRET)

    if (!payload?.id) {
      return res.status(401).json({ error: "Invalid token payload" })
    }

    // ✅ Fresh lookup — never trust companyId/role/isOnboarded from the
    // token itself, since those can change after the token was issued.
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        role: true,
        companyId: true,
        isOnboarded: true,
      },
    })

    if (!dbUser) {
      return res.status(401).json({ error: "User no longer exists" })
    }

    req.user = {
      id: dbUser.id,
      role: dbUser.role?.toLowerCase(),
      email: dbUser.email,
      companyId: dbUser.companyId ?? null,
      isOnboarded: dbUser.isOnboarded ?? false,
    }

    next()
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" })
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin role required" })
  }

  next()
}