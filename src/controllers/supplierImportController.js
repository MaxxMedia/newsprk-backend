import path from "path";
import fs from "fs";
import { createPreview } from "../services/supplierImport/createPreview.js";
import prisma from "../prismaClient.js";
import { executePreview } from "../services/supplierImport/executePreview.js";

export async function previewSupplierImport(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload an Excel file.",
      });
    }

    const result = await createPreview(
      req.file.path,
      req.user.id,
      req.file.originalname
    );

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

export async function getImportBatch(req, res) {
  try {
    const batch = await prisma.importBatch.findUnique({
      where: {
        batchId: req.params.batchId,
      },

      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },

        rows: {
          orderBy: {
            rowNumber: "asc",
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: "Batch not found",
      });
    }

    return res.json({
      success: true,
      batch,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

export async function getImportBatches(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    const skip = (page - 1) * limit;

    const [batches, total] = await Promise.all([
      prisma.importBatch.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          _count: {
            select: {
              rows: true,
            },
          },
        },
      }),

      prisma.importBatch.count(),
    ]);

    return res.json({
      success: true,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      batches,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

export async function executeSupplierImport(req, res) {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({
        error: "batchId is required",
      });
    }

    const report = await executePreview(batchId);

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

export async function deleteImportBatch(req, res) {
  try {
    const batch = await prisma.importBatch.findUnique({
      where: {
        batchId: req.params.batchId,
      },
    });

    if (!batch) {
      return res.status(404).json({
        error: "Batch not found",
      });
    }

    if (batch.status !== "PREVIEW") {
      return res.status(400).json({
        error: "Only preview batches can be deleted.",
      });
    }

    await prisma.$transaction([
      prisma.importBatchRow.deleteMany({
        where: {
          batchId: batch.batchId,
        },
      }),

      prisma.importBatch.delete({
        where: {
          batchId: batch.batchId,
        },
      }),
    ]);

    return res.json({
      success: true,
      message: "Batch deleted successfully.",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}

export async function downloadImportTemplate(req, res) {
  try {
    const filePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "supplier_import_template.xlsx"
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Template not found.",
      });
    }

    return res.download(
      filePath,
      "Supplier_Import_Template.xlsx"
    );
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}


export async function exportFailedRows(req, res) {

}