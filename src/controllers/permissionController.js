// src/controllers/permissionController.js

import { prisma } from "../lib/prisma.js";

/**
 * GET /admin/permissions
 * Returns every permission in the system, grouped by module — used by
 * the frontend to render the permission-assignment checkbox list.
 */
export async function getAllPermissions(req, res) {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: [{ module: "asc" }, { key: "asc" }],
        });

        const grouped = permissions.reduce((acc, p) => {
            const moduleName = p.module || "other";
            if (!acc[moduleName]) acc[moduleName] = [];
            // ✅ include `module` so grouped items match the frontend's
            // Permission interface ({ key, label, module }) exactly —
            // previously only key/label were pushed here.
            acc[moduleName].push({ key: p.key, label: p.label, module: moduleName });
            return acc;
        }, {});

        res.json({
            total: permissions.length,
            modules: grouped,
            flat: permissions.map((p) => ({ key: p.key, label: p.label, module: p.module })),
        });
    } catch (err) {
        console.error("Get permissions error:", err);
        res.status(500).json({ error: "Failed to fetch permissions" });
    }
}