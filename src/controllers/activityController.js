// src/controllers/activityController.js
//
// Read-only endpoints over AdminActivity, for the sub-admin tracking
// dashboard (recent actions, per-user activity counts, etc). Writes
// happen via src/lib/activityLogger.js from inside other controllers —
// there is no public "create activity" endpoint.

import { prisma } from "../lib/prisma.js";

const MAX_PAGE_SIZE = 100;

/* ================= LIST ACTIVITY (paginated, filterable) ================= */
export async function getActivity(req, res) {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.pageSize) || 25));

        const where = {};
        if (req.query.userId) {
            const userId = Number(req.query.userId);
            if (Number.isInteger(userId)) where.userId = userId;
        }
        if (req.query.module) where.module = req.query.module;
        if (req.query.action) where.action = req.query.action;
        if (req.query.from || req.query.to) {
            where.createdAt = {};
            if (req.query.from) where.createdAt.gte = new Date(req.query.from);
            if (req.query.to) where.createdAt.lte = new Date(req.query.to);
        }

        const [total, items] = await Promise.all([
            prisma.adminActivity.count({ where }),
            prisma.adminActivity.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    User: { select: { id: true, fullName: true, email: true, role: true } },
                },
            }),
        ]);

        res.json({
            items,
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (err) {
        console.error("Get activity error:", err);
        res.status(500).json({ error: "Failed to fetch activity log" });
    }
}

/* ================= PER-ADMIN ACTIVITY SUMMARY ================= */
export async function getActivitySummary(req, res) {
    try {
        const grouped = await prisma.adminActivity.groupBy({
            by: ["userId"],
            _count: { _all: true },
            _max: { createdAt: true },
        });

        if (grouped.length === 0) {
            return res.json([]);
        }

        const users = await prisma.user.findMany({
            where: { id: { in: grouped.map((g) => g.userId) } },
            select: { id: true, fullName: true, email: true, role: true, isActive: true, lastLoginAt: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));

        const summary = grouped
            .map((g) => ({
                user: userMap.get(g.userId) || { id: g.userId },
                activityCount: g._count._all,
                lastActivityAt: g._max.createdAt,
            }))
            .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));

        res.json(summary);
    } catch (err) {
        console.error("Get activity summary error:", err);
        res.status(500).json({ error: "Failed to fetch activity summary" });
    }
}
