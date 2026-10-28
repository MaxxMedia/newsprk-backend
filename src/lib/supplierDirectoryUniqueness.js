// Keep the duplicate check and write in one serializable transaction.
// Retrying a write conflict makes simultaneous submissions recheck the name.
export async function withUniqueSupplierDirectoryName(prisma, names, write, excludeId) {
  const normalizedNames = (Array.isArray(names) ? names : [names]).map(
    (name) => typeof name === "string" ? name.trim() : ""
  );

  if (normalizedNames.some((name) => !name)) {
    throw Object.assign(new Error("Company name is required"), {
      status: 400,
      code: "INVALID_SUPPLIER_DIRECTORY_NAME",
    });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        for (const name of normalizedNames) {
          // Trim stored names too, so older records with spaces still match.
          const existing = await tx.$queryRaw`
            SELECT "id" FROM "SupplierDirectory"
            WHERE lower(btrim("name")) = lower(${name})
              AND "id" <> ${excludeId ?? -1}
            LIMIT 1
          `;

          if (existing.length) {
            throw Object.assign(
              new Error("A supplier directory with this company name already exists."),
              { status: 409, code: "SUPPLIER_DIRECTORY_NAME_EXISTS" }
            );
          }
        }

        return write(tx, normalizedNames[0]);
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error.code !== "P2034" || attempt === 2) throw error;
    }
  }
}
