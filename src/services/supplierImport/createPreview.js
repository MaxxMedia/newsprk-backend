import prisma from "../../prismaClient.js";
import parseExcel from "./parseExcel.js";
import { validateImport } from "./validateImport.js";

export async function createPreview(filePath, adminId, fileName) {
  // Parse Excel
  const excelRows = parseExcel(filePath);

  // Validate rows
  const result = await validateImport(excelRows);

  const batchId = `IMPORT-${Date.now()}`;

  // Create Import Batch
  await prisma.importBatch.create({
    data: {
      batchId,
      fileName,
      totalRows: result.total,
      validRows: result.ready,
      invalidRows: result.invalid,
      importedRows: 0,
      failedRows: 0,
      createdById: adminId,
      status: "PREVIEW",
    },
  });

  // Save preview rows
  if (result.rows.length) {
    await prisma.importBatchRow.createMany({
      data: result.rows.map((row) => ({
        batchId,
        rowNumber: row.rowNumber,
        companyName: row.companyName,
        email: row.email,
        phone: row.phoneNumber,
        website: row.website,
        description: row.description,
        status: row.status,
        error: row.error,
      })),
    });
  }

  return {
    batchId,
    total: result.total,
    ready: result.ready,
    update: result.update,
    duplicate: result.duplicate,
    invalid: result.invalid,
    rows: result.rows,
  };
}