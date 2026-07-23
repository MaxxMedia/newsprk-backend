// src/lib/permissions.js
//
// Single source of truth for every permission key in the system.
// Used by:
//   - prisma/seed-permissions.js  (to populate the Permission table)
//   - subAdminController.js       (to validate keys sent from the client)
//   - roleController.js           (to validate keys sent from the client)
//
// Add new permissions here ONLY. Do not hardcode permission strings
// anywhere else in the codebase.

export const ALL_PERMISSIONS = [
    // Dashboard
    { key: "dashboard.view", label: "View Dashboard", module: "dashboard" },

    // Users
    { key: "users.view", label: "View Users", module: "users" },
    { key: "users.create", label: "Create Users", module: "users" },
    { key: "users.edit", label: "Edit Users", module: "users" },
    { key: "users.delete", label: "Delete Users", module: "users" },

    // Companies
    { key: "companies.view", label: "View Companies", module: "companies" },
    { key: "companies.create", label: "Create Companies", module: "companies" },
    { key: "companies.edit", label: "Edit Companies", module: "companies" },
    { key: "companies.delete", label: "Delete Companies", module: "companies" },

    // Jobs
    { key: "jobs.view", label: "View Jobs", module: "jobs" },
    { key: "jobs.create", label: "Create Jobs", module: "jobs" },
    { key: "jobs.edit", label: "Edit Jobs", module: "jobs" },
    { key: "jobs.delete", label: "Delete Jobs", module: "jobs" },

    // Articles / Posts
    { key: "articles.view", label: "View Articles", module: "articles" },
    { key: "articles.approve", label: "Approve Articles", module: "articles" },
    { key: "articles.reject", label: "Reject Articles", module: "articles" },

    // Supplier Directory
    { key: "supplier.view", label: "View Supplier Directories", module: "supplier" },
    { key: "supplier.approve", label: "Approve Supplier Directories", module: "supplier" },
    { key: "supplier.reject", label: "Reject Supplier Directories", module: "supplier" },

    // Events
    { key: "events.view", label: "View Events", module: "events" },
    { key: "events.create", label: "Create Events", module: "events" },
    { key: "events.edit", label: "Edit Events", module: "events" },
    { key: "events.delete", label: "Delete Events", module: "events" },

    // Payments
    { key: "payments.view", label: "View Payments", module: "payments" },

    // Packages
    { key: "packages.view", label: "View Packages", module: "packages" },

    // Newsletter
    { key: "newsletter.view", label: "View Newsletter", module: "newsletter" },

    // Analytics
    { key: "analytics.view", label: "View Analytics", module: "analytics" },

    // Settings
    { key: "settings.view", label: "View Settings", module: "settings" },

    // Banners (AdvertisementBanner)
    { key: "banners.view", label: "View Banners", module: "banners" },
    { key: "banners.create", label: "Create Banners", module: "banners" },
    { key: "banners.edit", label: "Edit Banners", module: "banners" },
    { key: "banners.delete", label: "Delete Banners", module: "banners" },

    // Leads
    { key: "leads.view", label: "View Leads", module: "leads" },
    { key: "leads.edit", label: "Edit Lead Status", module: "leads" },

    // Contact messages
    { key: "contact.view", label: "View Contact Messages", module: "contact" },
    { key: "contact.edit", label: "Update Contact Message Status", module: "contact" },

    // Magazine
    { key: "magazine.view", label: "View Magazines", module: "magazine" },
    { key: "magazine.create", label: "Create Magazines", module: "magazine" },
    { key: "magazine.edit", label: "Edit Magazines", module: "magazine" },
    { key: "magazine.delete", label: "Delete Magazines", module: "magazine" },

    // Industry Talks
    { key: "industry_talks.view", label: "View Industry Talks", module: "industry_talks" },
    { key: "industry_talks.create", label: "Create Industry Talks", module: "industry_talks" },
    { key: "industry_talks.edit", label: "Edit Industry Talks", module: "industry_talks" },
];

export const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);

/**
 * Roles that bypass permission checks entirely.
 * "admin" is kept here for backward compatibility with the existing
 * legacy admin accounts that predate this RBAC system.
 *
 * NOTE: this is the coarse User.role STRING bypass and is unrelated to
 * the new Role/RolePermission tables — a "Super Admin" Role row can
 * exist for consistency in the UI, but the actual bypass here is still
 * driven by this array, exactly as before.
 */
export const SUPER_ROLES = ["super_admin", "admin"];

/**
 * Resolve the effective list of permission keys for a user.
 *
 * Resolution order (highest precedence first):
 *   1. UserPermission override (granted: true adds, granted: false removes)
 *   2. RolePermission (defaults inherited from the user's assigned Role)
 *   3. Legacy fallback: if the user has no roleId at all, a plain
 *      UserPermission grant (as before RBAC v2) is treated as the
 *      complete permission set — this preserves behavior for any
 *      sub-admin created before roles existed.
 *
 * - super_admin / admin (string role) -> every permission that exists
 * - anyone with a roleId               -> role defaults, then overridden
 * - sub_admin with no roleId (legacy)  -> raw UserPermission grants only
 * - anything else                      -> no admin permissions
 */
export async function getUserPermissionKeys(prisma, userId, role) {
    const normalizedRole = role?.toLowerCase();

    if (SUPER_ROLES.includes(normalizedRole)) {
        const all = await prisma.permission.findMany({ select: { key: true } });
        return all.map((p) => p.key);
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roleId: true, role: true },
    });

    const overrides = await prisma.userPermission.findMany({
        where: { userId },
        select: { permission: { select: { key: true } } },
    });
    const grantedOverrides = overrides.filter((o) => o.granted).map((o) => o.permission.key);
    const deniedOverrides = new Set(
        overrides.filter((o) => !o.granted).map((o) => o.permission.key)
    );

    if (user?.roleId) {
        const roleDefaults = await prisma.rolePermission.findMany({
            where: { roleId: user.roleId, role: { isActive: true } },
            select: { permission: { select: { key: true } } },
        });
        const defaultKeys = roleDefaults.map((rp) => rp.permission.key);

        const effective = new Set([...defaultKeys, ...grantedOverrides]);
        for (const denied of deniedOverrides) effective.delete(denied);

        return Array.from(effective);
    }

    // Legacy path: sub_admin (or any other role) with no Role assigned
    // yet behaves exactly as it did before RBAC v2 — plain grants only.
    if (normalizedRole === "sub_admin") {
        return grantedOverrides;
    }

    return [];
}

/**
 * Efficient single-permission check used by the requirePermission /
 * requireAnyPermission middleware. Same resolution order as
 * getUserPermissionKeys, without materializing the full set.
 */
export async function hasPermission(prisma, userId, role, permissionKey) {
    const normalizedRole = role?.toLowerCase();

    if (SUPER_ROLES.includes(normalizedRole)) {
        return true;
    }

    // 1. UserPermission override always wins if present, in either direction.
    const override = await prisma.userPermission.findFirst({
        where: {
            userId,
            permission: {
                key: permissionKey,
            },
        },
        select: {
            id: true,
        },
    });

    if (override) {
        return true;
    }

    // 2. Fall back to the user's Role defaults.
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { roleId: true },
    });

    if (user?.roleId) {
        const roleGrant = await prisma.rolePermission.findFirst({
            where: {
                roleId: user.roleId,
                permission: { key: permissionKey },
                role: { isActive: true },
            },
            select: { id: true },
        });
        return !!roleGrant;
    }

    // 3. No role assigned at all -> no permission (no override existed either).
    return false;
}

/**
 * Call this once when your server starts (see index.js/app.js example
 * below). It upserts every permission in ALL_PERMISSIONS into the DB —
 * safe to run on every boot, it just no-ops for keys that already
 * exist and adds any new ones you add to the list above.
 *
 * No manual "run this script" step required. Example wiring in your
 * app entrypoint:
 *
 *   import { prisma } from "./lib/prisma.js";
 *   import { ensurePermissionsSeeded } from "./lib/permissions.js";
 *
 *   async function start() {
 *     await ensurePermissionsSeeded(prisma);
 *     app.listen(PORT, () => console.log(`Server running on ${PORT}`));
 *   }
 *   start();
 */
export async function ensurePermissionsSeeded(prisma) {
    for (const perm of ALL_PERMISSIONS) {
        await prisma.permission.upsert({
            where: { key: perm.key },
            update: { label: perm.label, module: perm.module },
            create: perm,
        });
    }
    console.log(`✅ Permissions synced (${ALL_PERMISSIONS.length} keys)`);
}
