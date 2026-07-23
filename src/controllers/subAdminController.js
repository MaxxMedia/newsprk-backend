// src/controllers/subAdminController.js
//
// All routes here are mounted behind requireAuth + requireSuperAdmin
// (see src/routes/adminSubAdminRoutes.js) — only SUPER_ADMIN (and the
// legacy "admin" role) can manage sub-admins.
//
// ✅ RBAC v2: sub-admins are now primarily driven by `roleId` (a link
// to the Role/RolePermission tables — see roleController.js). The
// `permissions` array is KEPT and still accepted on create/update, but
// it now writes to UserPermission as an OVERRIDE layer on top of
// whatever the assigned role grants by default, rather than being the
// sole source of truth. This means existing frontend code that only
// ever sent `permissions` keeps working unchanged; new code can send
// `roleId` (recommended) and optionally still layer `permissions` on
// top for one-off exceptions.

import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { ALL_PERMISSION_KEYS } from "../lib/permissions.js";
import { logActivity } from "../lib/activityLogger.js";

const SALT_ROUNDS = 12;

const SAFE_SELECT = {
    id: true,
    email: true,
    username: true,
    fullName: true,
    role: true,
    isActive: true,
    isOnboarded: true,
    createdAt: true,
    lastLoginAt: true,
    roleId: true,
    roleTemplate: { select: { id: true, name: true, slug: true, isActive: true } },
};

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

function formatSubAdmin(user) {
    if (!user) return user;
    const { roleTemplate, ...rest } = user;
    return { ...rest, role_info: roleTemplate || null };
}

// Accepts a real number, a numeric string ("5" — e.g. from a Postman
// variable substituted inside a quoted JSON field), null/undefined
// (no role), or anything else (rejected).
function normalizeRoleId(rawRoleId) {
    if (rawRoleId === undefined) return { roleId: undefined, error: null };
    if (rawRoleId === null || rawRoleId === "") return { roleId: null, error: null };
    const asNumber = typeof rawRoleId === "string" ? Number(rawRoleId) : rawRoleId;
    if (!Number.isInteger(asNumber)) return { roleId: undefined, error: "roleId must be an integer" };
    return { roleId: asNumber, error: null };
}

async function assertRoleExists(roleId) {
    if (roleId === undefined || roleId === null) return null;
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return "Role not found";
    if (!role.isActive) return "Cannot assign an inactive role";
    return null;
}

/* ================= CREATE SUB ADMIN ================= */
export async function createSubAdmin(req, res) {
    try {
        const { email, password, fullName, permissions = [] } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const { roleId, error: roleIdError } = normalizeRoleId(req.body.roleId);
        if (roleIdError) {
            return res.status(400).json({ error: roleIdError });
        }
        const roleError = await assertRoleExists(roleId);
        if (roleError) {
            return res.status(400).json({ error: roleError });
        }

        // `permissions` (if sent) is treated as an explicit UserPermission
        // override layer on top of the role's defaults — still fully
        // supported for backward compatibility with existing clients.
        const permError = validatePermissionKeys(permissions);
        if (permError) {
            return res.status(400).json({ error: permError });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: "A user with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") +
            "_" + Date.now().toString().slice(-5);

        const permissionRows = permissions.length
            ? await prisma.permission.findMany({ where: { key: { in: permissions } } })
            : [];

        const subAdmin = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    username,
                    fullName: fullName || null,
                    role: "sub_admin",
                    roleId: roleId ?? null,
                    emailVerified: true,
                    isOnboarded: true,
                    isActive: true,
                },
            });

            if (permissionRows.length > 0) {
                await tx.userPermission.createMany({
                    data: permissionRows.map((p) => ({
                        userId: user.id,
                        permissionId: p.id,
                        grantedById: req.user.id,
                        granted: true,
                    })),
                    skipDuplicates: true,
                });
            }

            return user;
        });

        const created = await prisma.user.findUnique({
            where: { id: subAdmin.id },
            select: SAFE_SELECT,
        });

        await logActivity(prisma, {
            userId: req.user.id,
            action: "sub_admin.created",
            module: "sub_admins",
            entityId: subAdmin.id,
            req,
            metadata: { email, roleId: roleId ?? null, permissionOverrides: permissions },
        });

        res.status(201).json({
            message: "Sub admin created successfully",
            subAdmin: formatSubAdmin(created),
        });
    } catch (err) {
        console.error("Create sub admin error:", err);
        if (err.code === "P2002") {
            return res.status(409).json({ error: "Email or username already exists" });
        }
        res.status(500).json({ error: "Failed to create sub admin" });
    }
}

/* ================= LIST SUB ADMINS ================= */
export async function getSubAdmins(req, res) {
    try {
        const subAdmins = await prisma.user.findMany({
            where: { role: "sub_admin" },
            orderBy: { createdAt: "desc" },
            select: {
                ...SAFE_SELECT,
                userPermissions: {
                    select: {
                        granted: true, // ✅ FIX: was missing, so `up.granted` was always undefined
                        permission: { select: { key: true, label: true, module: true } },
                    },
                },
            },
        });

        const formatted = subAdmins.map((u) => {
            const { userPermissions, roleTemplate, ...rest } = u;
            return {
                ...rest,
                role_info: roleTemplate || null,
                permissionOverrides: userPermissions.map((up) => ({
                    key: up.permission.key,
                    granted: up.granted,
                })),
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error("List sub admins error:", err);
        res.status(500).json({ error: "Failed to fetch sub admins" });
    }
}

/* ================= GET SINGLE SUB ADMIN ================= */
export async function getSubAdminById(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid sub admin id" });
        }

        const subAdmin = await prisma.user.findFirst({
            where: { id, role: "sub_admin" },
            select: {
                ...SAFE_SELECT,
                userPermissions: {
                    select: {
                        granted: true, // ✅ FIX: was missing, so `up.granted` was always undefined
                        permission: { select: { key: true, label: true, module: true } },
                    },
                },
            },
        });

        if (!subAdmin) {
            return res.status(404).json({ error: "Sub admin not found" });
        }

        const { userPermissions, roleTemplate, ...rest } = subAdmin;

        res.json({
            ...rest,
            role_info: roleTemplate || null,
            permissionOverrides: userPermissions.map((up) => ({
                key: up.permission.key,
                granted: up.granted,
            })),
        });
    } catch (err) {
        console.error("Get sub admin error:", err);
        res.status(500).json({ error: "Failed to fetch sub admin" });
    }
}

/* ================= UPDATE SUB ADMIN (profile + role) ================= */
export async function updateSubAdmin(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid sub admin id" });
        }

        const existing = await prisma.user.findFirst({ where: { id, role: "sub_admin" } });
        if (!existing) {
            return res.status(404).json({ error: "Sub admin not found" });
        }

        const { fullName, email, password } = req.body;
        const data = {};

        if (email && email !== existing.email) {
            const emailTaken = await prisma.user.findUnique({ where: { email } });
            if (emailTaken) {
                return res.status(409).json({ error: "Email already in use" });
            }
            data.email = email;
        }

        if (fullName !== undefined) data.fullName = fullName;

        if (password) {
            data.password = await bcrypt.hash(password, SALT_ROUNDS);
        }

        if (req.body.roleId !== undefined) {
            const { roleId, error: roleIdError } = normalizeRoleId(req.body.roleId);
            if (roleIdError) {
                return res.status(400).json({ error: roleIdError });
            }
            if (roleId === null) {
                data.roleId = null; // explicitly unassign — falls back to legacy UserPermission-only resolution
            } else {
                const roleError = await assertRoleExists(roleId);
                if (roleError) {
                    return res.status(400).json({ error: roleError });
                }
                data.roleId = roleId;
            }
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        const updated = await prisma.user.update({
            where: { id },
            data,
            select: SAFE_SELECT,
        });

        await logActivity(prisma, {
            userId: req.user.id,
            action: "sub_admin.updated",
            module: "sub_admins",
            entityId: id,
            req,
            metadata: { fields: Object.keys(data) },
        });

        res.json({ message: "Sub admin updated successfully", subAdmin: formatSubAdmin(updated) });
    } catch (err) {
        console.error("Update sub admin error:", err);
        if (err.code === "P2002") {
            return res.status(409).json({ error: "Email already in use" });
        }
        res.status(500).json({ error: "Failed to update sub admin" });
    }
}

/* ================= DELETE SUB ADMIN ================= */
export async function deleteSubAdmin(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid sub admin id" });
        }

        const existing = await prisma.user.findFirst({ where: { id, role: "sub_admin" } });
        if (!existing) {
            return res.status(404).json({ error: "Sub admin not found" });
        }

        // UserPermission rows are removed automatically via onDelete: Cascade
        await prisma.user.delete({ where: { id } });

        await logActivity(prisma, {
            userId: req.user.id,
            action: "sub_admin.deleted",
            module: "sub_admins",
            entityId: id,
            req,
            metadata: { email: existing.email },
        });

        res.json({ message: "Sub admin deleted successfully" });
    } catch (err) {
        console.error("Delete sub admin error:", err);
        res.status(500).json({ error: "Failed to delete sub admin" });
    }
}

/* ================= TOGGLE / SET SUB ADMIN STATUS ================= */
export async function updateSubAdminStatus(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid sub admin id" });
        }

        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(400).json({ error: "isActive (boolean) is required" });
        }

        const existing = await prisma.user.findFirst({ where: { id, role: "sub_admin" } });
        if (!existing) {
            return res.status(404).json({ error: "Sub admin not found" });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { isActive },
            select: SAFE_SELECT,
        });

        await logActivity(prisma, {
            userId: req.user.id,
            action: `sub_admin.${isActive ? "activated" : "deactivated"}`,
            module: "sub_admins",
            entityId: id,
            req,
        });

        res.json({
            message: `Sub admin ${isActive ? "activated" : "deactivated"} successfully`,
            subAdmin: formatSubAdmin(updated),
        });
    } catch (err) {
        console.error("Update sub admin status error:", err);
        res.status(500).json({ error: "Failed to update sub admin status" });
    }
}

/* ================= ASSIGN PERMISSIONS (individual UserPermission overrides) =================
 *
 * ✅ RBAC v2: this endpoint's contract is unchanged — it still accepts
 * `{ permissions: string[] }` (legacy, grants-only) and now also
 * accepts `{ overrides: [{ key, granted }] }` (RBAC v2, supports
 * explicit deny of a role default). Either shape REPLACES the
 * sub-admin's full override set — this is the ONLY permissions-write
 * endpoint; the old `updateSubAdminPermissions` handler has been
 * removed because it never persisted denials and duplicated this
 * logic incompletely.
 */
export async function assignPermissions(req, res) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid sub admin id" });
        }

        const { permissions, overrides } = req.body;

        // Two accepted body shapes:
        //   Legacy (unchanged):  { "permissions": ["jobs.view", "jobs.edit"] }
        //     -> every listed key becomes a GRANT override (granted: true).
        //   New (RBAC v2):       { "overrides": [{ "key": "jobs.view", "granted": true },
        //                                         { "key": "jobs.delete", "granted": false }] }
        //     -> lets you explicitly DENY a permission the role would
        //        otherwise grant, not just add extra ones.
        // Either way, this call REPLACES the sub-admin's full override set.
        let normalizedOverrides;

        if (Array.isArray(overrides)) {
            const keys = overrides.map((o) => o?.key);
            const permError = validatePermissionKeys(keys);
            if (permError) {
                return res.status(400).json({ error: permError });
            }
            if (overrides.some((o) => typeof o?.granted !== "boolean")) {
                return res
                    .status(400)
                    .json({ error: "Each override needs a boolean `granted` field" });
            }
            normalizedOverrides = overrides.map((o) => ({ key: o.key, granted: o.granted }));
        } else {
            const permError = validatePermissionKeys(permissions || []);
            if (permError) {
                return res.status(400).json({ error: permError });
            }
            normalizedOverrides = (permissions || []).map((key) => ({ key, granted: true }));
        }

        const existing = await prisma.user.findFirst({ where: { id, role: "sub_admin" } });
        if (!existing) {
            return res.status(404).json({ error: "Sub admin not found" });
        }

        const permissionRows = normalizedOverrides.length
            ? await prisma.permission.findMany({
                where: { key: { in: normalizedOverrides.map((o) => o.key) } },
            })
            : [];
        const rowsByKey = new Map(permissionRows.map((p) => [p.key, p]));

        await prisma.$transaction(async (tx) => {
            await tx.userPermission.deleteMany({ where: { userId: id } });

            if (normalizedOverrides.length > 0) {
                await tx.userPermission.createMany({
                    data: normalizedOverrides.map((o) => ({
                        userId: id,
                        permissionId: rowsByKey.get(o.key).id,
                        grantedById: req.user.id,
                        granted: o.granted,
                    })),
                    skipDuplicates: true,
                });
            }
        });

        await logActivity(prisma, {
            userId: req.user.id,
            action: "sub_admin.permission_overrides_updated",
            module: "sub_admins",
            entityId: id,
            req,
            metadata: { overrides: normalizedOverrides },
        });

        res.json({
            message: "Permissions updated successfully",
            subAdminId: id,
            overrides: normalizedOverrides,
        });
    } catch (err) {
        console.error("Assign permissions error:", err);
        res.status(500).json({ error: "Failed to assign permissions" });
    }
}