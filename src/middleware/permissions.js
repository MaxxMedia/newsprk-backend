// src/middleware/permissions.js

import { prisma } from "../lib/prisma.js";
import { SUPER_ROLES, hasPermission } from "../lib/permissions.js";

export function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
    }

    const role = req.user.role?.toLowerCase();

    if (!SUPER_ROLES.includes(role)) {
        return res.status(403).json({ error: "Super admin access required" });
    }

    next();
}

/**
 * requirePermission("users.view")
 *
 * Also blocks inactive accounts (isActive === false) from passing any
 * permission check, even if they still hold a valid JWT.
 */
export function requirePermission(permissionKey) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Not authenticated" });
            }

            const role = req.user.role?.toLowerCase();

            // Full-access roles bypass all permission checks
            if (SUPER_ROLES.includes(role)) {
                return next();
            }

            // Guard against a deactivated account using an old token
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { isActive: true },
            });

            if (!user || user.isActive === false) {
                return res.status(403).json({ error: "Account is deactivated" });
            }

            const allowed = await hasPermission(prisma, req.user.id, role, permissionKey);

            if (!allowed) {
                return res
                    .status(403)
                    .json({ error: `Missing required permission: ${permissionKey}` });
            }

            next();
        } catch (err) {
            console.error("Permission check error:", err);
            return res.status(500).json({ error: "Permission check failed" });
        }
    };
}

/**
 * requireAnyPermission(["users.view", "users.edit"])
 * Passes if the user has AT LEAST ONE of the listed permissions.
 * Useful for routes shared by multiple views (e.g. a list screen that
 * both an editor and a viewer role should be able to load).
 */
export function requireAnyPermission(permissionKeys = []) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Not authenticated" });
            }

            const role = req.user.role?.toLowerCase();

            if (SUPER_ROLES.includes(role)) {
                return next();
            }

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { isActive: true },
            });

            if (!user || user.isActive === false) {
                return res.status(403).json({ error: "Account is deactivated" });
            }

            const checks = await Promise.all(
                permissionKeys.map((key) => hasPermission(prisma, req.user.id, role, key))
            );

            if (!checks.some(Boolean)) {
                return res.status(403).json({
                    error: `Missing required permission (any of): ${permissionKeys.join(", ")}`,
                });
            }

            next();
        } catch (err) {
            console.error("Permission check error:", err);
            return res.status(500).json({ error: "Permission check failed" });
        }
    };
}
