import prisma from "../../prismaClient.js";

export async function executeImport(validRows) {
  const report = {
    imported: 0,
    linkedUsers: 0,
    linkedCompanies: 0,
    failed: 0,
    errors: [],
  };

  const batchId = `IMPORT-${Date.now()}`;

  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      try {
        /* =====================================
           Find Existing Company
        ====================================== */

        let company = await tx.company.findUnique({
          where: {
            slug: row.slug,
          },
        });

        /* =====================================
           Create Company if not exists
        ====================================== */

        if (!company) {
          company = await tx.company.create({
            data: {
              name: row.companyName,
              slug: row.slug,
              email: row.email,
              website: row.website,

              // Remove these if they don't exist
              isImported: true,
              importBatchId: batchId,
              importedAt: new Date(),
            },
          });

          report.linkedCompanies++;
        }

        /* =====================================
           Supplier Claimed?
        ====================================== */

        const claimed = !!row.user;

        /* =====================================
           Create Supplier Directory
        ====================================== */

        await tx.supplierDirectory.create({
          data: {
            companyName: row.companyName,
            slug: row.slug,

            email: row.email,
            importedEmail: row.email,

            phoneNumber: row.phoneNumber,
            website: row.website,
            description: row.description,

            companyId: company.id,

            submittedById: row.user?.id || null,

            claimed,

            claimedAt: claimed ? new Date() : null,

            importBatchId: batchId,

            importedAt: new Date(),

            importSource: "EXCEL",
          },
        });

        /* =====================================
           Update User if linked
        ====================================== */

        if (row.user) {
          await tx.user.update({
            where: {
              id: row.user.id,
            },
            data: {
              supplierClaimed: true,
            },
          });

          report.linkedUsers++;
        }

        report.imported++;
      } catch (err) {
        report.failed++;

        report.errors.push({
          company: row.companyName,
          error: err.message,
        });
      }
    }
  });

  return report;
}