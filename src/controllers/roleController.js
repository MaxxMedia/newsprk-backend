// src/controllers/roleController.js
//
// All routes here are mounted behind requireAuth + requireSuperAdmin
// (see src/routes/adminRoleRoutes.js) — only SUPER_ADMIN (and the
// legacy "admin" role) can manage roles and their default permissions.

import { prisma } from "../lib/prisma.js";
import { ALL_PERMISSION_KEYS } from "../lib/permissions.js";
import { logActivity } from "../lib/activityLogger.js";

function slugify(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function validatePermissionKeys(permissions) {
    if (!Array.isArray(permissions)) {
        return "permissions must be an array of permission keys";
    }
    const invalid = permissions.filter((p) => !ALL_PERMISSION_KEYS.includes(p));
    if (invalid.length > 0) {
        return `Invalid permission key(s): ${invalid.join(", ")}`;
    }
    return null;
}

const ROLE_WITH_COUNTS_SELECT = {
    id: true,
    name: true,
    slug: true,
    description: true,
    sortOrder: true,
    isSystem: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { users: true, rolePermissions: true } },
};

function formatRole(role) {
    if (!role) return role;
    const { _count, ...rest } = role;
    return {
        ...rest,
        userCount: _count?.users ?? 0,
        permissionCount: _count?.rolePermissions ?? 0,
    };
}

/* ================= LIST ROLES ================= */
export async function getRoles(req, res) {
    try {
        const roles = await prisma.role.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: ROLE_WITH_COUNTS_SELECT,
        });

        res.json(roles.map(formatRole));
    } catch (err) {
        console.error("List roles error:", err);
        res.status(500).json({ error: "Failed to fetch roles" });
    }
}

/* ================= GET SINGLE ROLE ================= */
export async function getRoleById(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid role id" });
        }

        const role = await prisma.role.findUnique({
            where: { id },
            select: ROLE_WITH_COUNTS_SELECT,
        });

        if (!role) {
            return res.status(404).json({ error: "Role not found" });
        }

        res.json(formatRole(role));
    } catch (err) {
        console.error("Get role error:", err);
        res.status(500).json({ error: "Failed to fetch role" });
    }
}

/* ================= CREATE ROLE ================= */
export async function createRole(req, res) {
    try {
        const { name, slug, description, sortOrder, permissions = [] } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Role name is required" });
        }

        const permError = validatePermissionKeys(permissions);
        if (permError) {
            return res.status(400).json({ error: permError });
        }

        const finalSlug = slug?.trim() ? slugify(slug) : slugify(name);
        if (!finalSlug) {
            return res.status(400).json({ error: "Could not derive a valid slug from the role name" });
        }

        const existing = await prisma.role.findUnique({ where: { slug: finalSlug } });
        if (existing) {
            return res.status(409).json({ error: "A role with this slug already exists" });
        }

        const permissionRows = permissions.length
            ? await prisma.permission.findMany({ where: { key: { in: permissions } } })
            : [];

        const role = await prisma.$transaction(async (tx) => {
            const created = await tx.role.create({
                data: {
                    name: name.trim(),
                    slug: finalSlug,
                    description: description || null,
                    sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
                    isSystem: false, // custom roles created via the API are never system roles
                    isActive: true,
                },
            });

            if (permissionRows.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionRows.map((p) => ({ roleId: created.id, permissionId: p.id })),
                    skipDuplicates: true,
                });
            }

            return created;
        });

        await logActivity(prisma, {
            userId: req.user.id,
            action: "role.created",
            module: "roles",
            entityId: role.id,
            req,
            metadata: { name: role.name, slug: role.slug, permissions },
        });

        const full = await prisma.role.findUnique({ where: { id: role.id }, select: ROLE_WITH_COUNTS_SELECT });

        res.status(201).json({ message: "Role created successfully", role: formatRole(full) });
    } catch (err) {
        console.error("Create role error:", err);
        if (err.code === "P2002") {
            return res.status(409).json({ error: "A role with this slug already exists" });
        }
        res.status(500).json({ error: "Failed to create role" });
    }
}

/* ================= UPDATE ROLE (metadata only — see updateRolePermissions for perms) ================= */
export async function updateRole(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid role id" });
        }

        const existing = await prisma.role.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Role not found" });
        }

        const { name, description, sortOrder } = req.body;
        const data = {};

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ error: "Role name cannot be empty" });
            }
            data.name = name.trim();
        }
        if (description !== undefined) data.description = description || null;
        if (sortOrder !== undefined) {
            if (!Number.isInteger(sortOrder)) {
                return res.status(400).json({ error: "sortOrder must be an integer" });
            }
            data.sortOrder = sortOrder;
        }

        // Note: slug is intentionally immutable after creation to avoid
        // silently breaking any code that references a role by slug.

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        const updated = await prisma.role.update({
            where: { id },
            data,
            select: ROLE_WITH_COUNTS_SELECT,
        });

        await logActivity(prisma, {
            userId: req.user.id,
            action: "role.updated",
            module: "roles",
            entityId: id,
            req,
            metadata: data,
        });

        res.json({ message: "Role updated successfully", role: formatRole(updated) });
    } catch (err) {
        console.error("Update role error:", err);
        res.status(500).json({ error: "Failed to update role" });
    }
}

/* ================= DELETE ROLE ================= */
export async function deleteRole(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid role id" });
        }

        const existing = await prisma.role.findUnique({
            where: { id },
            select: { id: true, name: true, isSystem: true, _count: { select: { users: true } } },
        });
        if (!existing) {
            return res.status(404).json({ error: "Role not found" });
        }

        if (existing.isSystem) {
            return res.status(400).json({ error: "System roles cannot be deleted" });
        }

        if (existing._count.users > 0) {
            return res.status(400).json({
                error: `Cannot delete role — ${existing._count.users} user(s) are still assigned to it. Reassign them first.`,
            });
        }

        // RolePermission rows cascade automatically (onDelete: Cascade)
        await prisma.role.delete({ where: { id } });

        await logActivity(prisma, {
            userId: req.user.id,
            action: "role.deleted",
            module: "roles",
            entityId: id,
            req,
            metadata: { name: existing.name },
        });

        res.json({ message: "Role deleted successfully" });
    } catch (err) {
        console.error("Delete role error:", err);
        res.status(500).json({ error: "Failed to delete role" });
    }
}

/* ================= TOGGLE / SET ROLE STATUS ================= */
export async function updateRoleStatus(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid role id" });
        }

        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(400).json({ error: "isActive (boolean) is required" });
        }

        const existing = await prisma.role.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Role not found" });
        }

        if (existing.isSystem && isActive === false) {
            return res.status(400).json({ error: "System roles cannot be deactivated" });
        }

        const updated = await prisma.role.update({
            where: { id },
            data: { isActive },
            select: ROLE_WITH_COUNTS_SELECT,
        });

        await logActivity(prisma, {
            userId: req.user.id,
            action: `role.${isActive ? "activated" : "deactivated"}`,
            module: "roles",
            entityId: id,
            req,
        });

        res.json({
            message: `Role ${isActive ? "activated" : "deactivated"} successfully`,
            role: formatRole(updated),
        });
    } catch (err) {
        console.error("Update role status error:", err);
        res.status(500).json({ error: "Failed to update role status" });
    }
}

/* ================= GET ROLE PERMISSIONS ================= */
export async function getRolePermissions(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid role id" });
        }

        const role = await prisma.role.findUnique({ where: { id } });
        if (!role) {
            return res.status(404).json({ error: "Role not found" });
        }

        const rolePermissions = await prisma.rolePermission.findMany({
            where: { roleId: id },
            select: { permission: { select: { key: true, label: true, module: true } } },
        });

        res.json({
            roleId: id,
            roleName: role.name,
            permissions: rolePermissions.map((rp) => rp.permission),
        });
    } catch (err) {
        console.error("Get role permissions error:", err);
        res.status(500).json({ error: "Failed to fetch role permissions" });
    }
}

/* ================= REPLACE ROLE PERMISSIONS (full set) ================= */
export async function updateRolePermissions(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid role id" });
        }

        const { permissions } = req.body;
        const permError = validatePermissionKeys(permissions || []);
        if (permError) {
            return res.status(400).json({ error: permError });
        }

        const existing = await prisma.role.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Role not found" });
        }

        const permissionRows = permissions.length
            ? await prisma.permission.findMany({ where: { key: { in: permissions } } })
            : [];

        await prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId: id } });

            if (permissionRows.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionRows.map((p) => ({ roleId: id, permissionId: p.id })),
                    skipDuplicates: true,
                });
            }
        });

        await logActivity(prisma, {
            userId: req.user.id,
            action: "role.permissions_updated",
            module: "roles",
            entityId: id,
            req,
            metadata: { permissions: permissionRows.map((p) => p.key) },
        });

        res.json({
            message: "Role permissions updated successfully",
            roleId: id,
            permissions: permissionRows.map((p) => p.key),
        });
    } catch (err) {
        console.error("Update role permissions error:", err);
        res.status(500).json({ error: "Failed to update role permissions" });
    }
}
