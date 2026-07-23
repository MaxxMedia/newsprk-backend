// src/lib/roles.js
import { ALL_PERMISSION_KEYS } from "./permissions.js";

export const DEFAULT_ROLES = [
    {
        name: "Super Admin",
        slug: "super_admin",
        description:
            "Full, unrestricted access to every module. Kept in sync with every permission that exists.",
        sortOrder: 0,
        isSystem: true,
        // Super Admin's actual bypass still comes from User.role === "super_admin"/"admin"
        // (see SUPER_ROLES in permissions.js) — this role row exists mainly so it shows
        // up consistently in the Roles UI and so custom roles can be modeled the same way.
        permissions: ALL_PERMISSION_KEYS,
    },
    {
        name: "Sub Admin",
        slug: "sub_admin",
        description: "Broad operational access without user/company deletion rights.",
        sortOrder: 1,
        isSystem: true,
        permissions: [
            "dashboard.view",
            "users.view",
            "users.edit",
            "companies.view",
            "companies.edit",
            "jobs.view",
            "jobs.create",
            "jobs.edit",
            "jobs.delete",
            "articles.view",
            "articles.approve",
            "articles.reject",
            "supplier.view",
            "supplier.approve",
            "supplier.reject",
            "events.view",
            "events.create",
            "events.edit",
            "payments.view",
            "packages.view",
            "newsletter.view",
            "analytics.view",
            "banners.view",
            "banners.create",
            "banners.edit",
            "leads.view",
            "leads.edit",
            "contact.view",
            "contact.edit",
            "magazine.view",
            "magazine.create",
            "magazine.edit",
        ],
    },
    {
        name: "Moderator",
        slug: "moderator",
        description: "Reviews and moderates user-submitted content (articles, suppliers, events).",
        sortOrder: 2,
        isSystem: true,
        permissions: [
            "dashboard.view",
            "articles.view",
            "articles.approve",
            "articles.reject",
            "supplier.view",
            "supplier.approve",
            "supplier.reject",
            "events.view",
            "events.edit",
            "magazine.view",
        ],
    },
    {
        name: "Support Staff",
        slug: "support_staff",
        description: "Front-line support: read access plus contact/lead handling.",
        sortOrder: 3,
        isSystem: true,
        permissions: [
            "dashboard.view",
            "users.view",
            "companies.view",
            "jobs.view",
            "leads.view",
            "leads.edit",
            "contact.view",
            "contact.edit",
        ],
    },
];

/**
 * Call once at server boot, right alongside ensurePermissionsSeeded.
 * Safe to run every boot: upserts by unique `slug`, and only touches
 * RolePermission rows for keys that currently exist in Permission.
 */
export async function ensureRolesSeeded(prisma) {
    for (const roleDef of DEFAULT_ROLES) {
        const role = await prisma.role.upsert({
            where: { slug: roleDef.slug },
            update: {
                name: roleDef.name,
                description: roleDef.description,
                sortOrder: roleDef.sortOrder,
                isSystem: true,
            },
            create: {
                name: roleDef.name,
                slug: roleDef.slug,
                description: roleDef.description,
                sortOrder: roleDef.sortOrder,
                isSystem: true,
            },
        });

        const permissionRows = await prisma.permission.findMany({
            where: { key: { in: roleDef.permissions } },
            select: { id: true },
        });

        if (permissionRows.length > 0) {
            await prisma.rolePermission.createMany({
                data: permissionRows.map((p) => ({ roleId: role.id, permissionId: p.id })),
                skipDuplicates: true,
            });
        }
    }
    console.log(`✅ System roles synced (${DEFAULT_ROLES.length} roles)`);
}
