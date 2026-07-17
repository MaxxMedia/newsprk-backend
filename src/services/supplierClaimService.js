import prisma from "../prismaClient.js";

export async function autoClaimSupplier(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return;

  if (user.supplierClaimed) return;

  const supplier = await prisma.supplierDirectory.findFirst({
    where: {
      importedEmail: user.email,
      claimed: false,
    },
  });

  if (!supplier) return;

  await prisma.$transaction(async (tx) => {
    let companyId = supplier.companyId;

    // If supplier doesn't already have a company, create one
    if (!companyId) {
      const slug = supplier.companyName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-");

      const company = await tx.company.create({
        data: {
          name: supplier.companyName,
          slug,
          email: supplier.email,
          website: supplier.website,
          isImported: true,
        },
      });

      companyId = company.id;

      await tx.supplierDirectory.update({
        where: { id: supplier.id },
        data: {
          companyId,
        },
      });
    }

    await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        companyId,
        supplierClaimed: true,
      },
    });

    await tx.supplierDirectory.update({
      where: {
        id: supplier.id,
      },
      data: {
        claimed: true,
        claimedAt: new Date(),
        submittedById: user.id,
      },
    });
  });
}