import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    console.log("Authorization Header:", authHeader);

    if (!authHeader) {
      return res.status(401).json({
        error: "Authorization header missing",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authorization format must be: Bearer <token>",
      });
    }

    const token = authHeader.substring(7);

    console.log("Token:", token);

    const decoded = jwt.verify(token, JWT_SECRET);

    console.log("Decoded JWT:", decoded);

    req.user = {
      id: decoded.id,
      role: decoded.role?.toLowerCase(),
      email: decoded.email,
      companyId: decoded.companyId ?? null,
    };

    next();
  } catch (err) {
    console.error("JWT Error:", err.name, err.message);

    return res.status(401).json({
      error: "Invalid or expired token",
      message: err.message,
    });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: "Not authenticated",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin role required",
    });
  }

  next();
}