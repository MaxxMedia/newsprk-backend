export async function logActivity(
    prisma,
    {
        userId,
        action,
        module,
        entityId = null,
    }
) {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                action,
                entity: module,
                entityId,
            },
        });
    } catch (err) {
        console.error("Activity log write failed:", err);
    }
}