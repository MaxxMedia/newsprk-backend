import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma.js"

/*
  ✅ ROOT-CAUSE FIX (part 1 of 2 — see server.js / loadEnv.js for part 2)

  JWT_SECRET used to be read ONCE at module load time into a top-level
  const:

      const JWT_SECRET = process.env.JWT_SECRET || "changeme"

  Because dotenv.config() in server.js ran AFTER this file was imported
  (ES module imports execute before other top-level code, regardless of
  where dotenv.config() appears in the file), process.env.JWT_SECRET
  was still undefined when this line ran — so JWT_SECRET got
  permanently locked to the fallback string "changeme" for the life of
  the process. Meanwhile tokens were being signed with the real secret
  from .env (read live inside the login handler), so every verification
  failed with a signature mismatch -> 401 on every request.

  Fix: read process.env.JWT_SECRET fresh, inside the function, on every
  request — never cache it in a module-level const. Combined with
  loading .env first in server.js, this is now correct either way.
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

    const secret = process.env.JWT_SECRET || "changeme" // ✅ read live, not cached
    const payload = jwt.verify(token, secret)

    if (!payload?.id) {
      return res.status(401).json({ error: "Invalid token payload" })
    }

    // Fresh lookup — never trust companyId/role/isOnboarded from the
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