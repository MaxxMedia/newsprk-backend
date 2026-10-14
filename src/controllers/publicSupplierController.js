import { hiddenDirectoryIds } from "../lib/companyPlanVisibility.js";
import { directoryForPlan } from "../lib/directoryPlanVisibility.js";
import { getActiveSubscription } from "../lib/packagePurchases.js";
import prisma from "../prismaClient.js"

export async function getSuppliers(req, res) {
  try {
    const { q } = req.query

    const suppliers = await prisma.supplierDirectory.findMany({
      where: {
        status: "APPROVED",
        id: { notIn: await hiddenDirectoryIds(prisma) },
        ...(q && {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { tradeNames: { contains: q } }, // JSON search (TiDB supported)
          ],
        }),
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        companyId: true,
        name: true,
        slug: true,
        logoUrl: true,
        website: true,
        description: true,
      },
    })

    res.json(await Promise.all(suppliers.map(async row => directoryForPlan(row, (await getActiveSubscription(row.companyId)).plan))))
  } catch (err) {
    console.error("Public suppliers error:", err)
    res.status(500).json({ error: "Failed to load suppliers" })
  }
}


export async function getSupplierShowroom(req, res) {
  try {
    const { slug } = req.params

    const supplier = await prisma.supplierDirectory.findFirst({
      where: {
        slug,
        status: "APPROVED",
      },
      include: {
        User_SupplierDirectory_submittedByIdToUser: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    })

    if (!supplier || (await hiddenDirectoryIds(prisma)).includes(supplier.id)) {
      return res.status(404).json({ error: "Supplier not found" })
    }

    res.json(directoryForPlan(supplier, (await getActiveSubscription(supplier.companyId)).plan))
  } catch (err) {
    console.error("Supplier showroom error:", err)
    res.status(500).json({ error: "Failed to load supplier" })
  }
}

export async function getSupplierBySlug(req, res) {
  try {
    const { slug } = req.params

    const supplier = await prisma.supplierDirectory.findFirst({
      where: {
        slug,
        status: "APPROVED",
      },
      include: {
        User_SupplierDirectory_submittedByIdToUser: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    })

    if (!supplier || (await hiddenDirectoryIds(prisma)).includes(supplier.id)) {
      return res.status(404).json({ error: "Supplier not found" })
    }

    res.json(directoryForPlan(supplier, (await getActiveSubscription(supplier.companyId)).plan))
  } catch (err) {
    console.error("Supplier showroom error:", err)
    res.status(500).json({ error: "Failed to load supplier" })
  }
}