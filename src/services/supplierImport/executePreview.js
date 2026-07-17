import slugify from "slugify";
import prisma from "../../prismaClient.js";

export async function executePreview(batchId) {
  const batch = await prisma.importBatch.findUnique({
    where: { batchId },
    include: { rows: true },
  });

  if (!batch) {
    throw new Error("Import batch not found.");
  }

  if (batch.status !== "PREVIEW") {
    throw new Error("This batch has already been processed.");
  }

  await prisma.importBatch.update({
    where: { batchId },
    data: {
      status: "IMPORTING",
    },
  });

  const report = {
    imported: 0,
    updated: 0,
    skipped: 0,
    linkedUsers: 0,
    createdCompanies: 0,
    failed: 0,
    errors: [],
  };

  for (const row of batch.rows) {
    // Skip rows that should not be imported
    if (row.status === "DUPLICATE" || row.status === "INVALID") {
      report.skipped++;
      continue;
    }

    // Skip UPDATE rows for now
    if (row.status === "UPDATE") {
      report.updated++;
      continue;
    }

    if (row.status !== "READY") {
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        const slug = slugify(row.companyName, {
          lower: true,
          strict: true,
        });

        const user = await tx.user.findUnique({
          where: {
            email: row.email,
          },
        });

        let company = await tx.company.findUnique({
          where: {
            slug,
          },
        });

        if (!company) {
          company = await tx.company.create({
            data: {
              name: row.companyName,
              slug,
              email: row.email,
              website: row.website,
              isImported: true,
            },
          });

          report.createdCompanies++;
        }

        await tx.supplierDirectory.create({
          data: {
            companyName: row.companyName,
            slug,
            email: row.email,
            importedEmail: row.email,
            phoneNumber: row.phone,
            website: row.website,
            description: row.description,

            companyId: company.id,

            submittedById: user?.id ?? null,

            claimed: !!user,
            claimedAt: user ? new Date() : null,

            importBatchId: batch.batchId,
            importedAt: new Date(),
            importSource: "EXCEL",
          },
        });

        await tx.importBatchRow.update({
          where: {
            id: row.id,
          },
          data: {
            status: "IMPORTED",
          },
        });

        report.imported++;

        if (user) {
          report.linkedUsers++;
        }
      });
    } catch (err) {
      report.failed++;

      report.errors.push({
        row: row.rowNumber,
        company: row.companyName,
        error: err.message,
      });

      await prisma.importBatchRow.update({
        where: {
          id: row.id,
        },
        data: {
          status: "FAILED",
          error: err.message,
        },
      });
    }
  }

  await prisma.importBatch.update({
    where: {
      batchId,
    },
    data: {
      importedRows: report.imported,
      failedRows: report.failed,
      importedAt: new Date(),
      status: report.failed > 0 ? "FAILED" : "COMPLETED",
    },
  });

  return report;
}