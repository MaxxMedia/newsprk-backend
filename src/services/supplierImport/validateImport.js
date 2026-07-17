import slugify from "slugify";
import prisma from "../../prismaClient.js";

export async function validateImport(rows) {
  // -----------------------------
  // Collect unique values
  // -----------------------------
  const emails = [];
  const slugs = [];

  for (const row of rows) {
    const companyName = row["Company Name"]?.trim();
    const email = row["Email"]?.trim().toLowerCase();

    if (email) emails.push(email);

    if (companyName) {
      slugs.push(
        slugify(companyName, {
          lower: true,
          strict: true,
        })
      );
    }
  }

  // -----------------------------
  // Load existing data
  // -----------------------------
  const [users, suppliers, companies] = await Promise.all([
    prisma.user.findMany({
      where: {
        email: {
          in: emails,
        },
      },
    }),

    prisma.supplierDirectory.findMany({
      where: {
        OR: [
          {
            slug: {
              in: slugs,
            },
          },
          {
            importedEmail: {
              in: emails,
            },
          },
        ],
      },
    }),

    prisma.company.findMany({
      where: {
        slug: {
          in: slugs,
        },
      },
    }),
  ]);

  // -----------------------------
  // Lookup Maps
  // -----------------------------
  const userMap = new Map();
  users.forEach((user) => {
    userMap.set(user.email.toLowerCase(), user);
  });

  const supplierEmailMap = new Map();
  const supplierSlugMap = new Map();

  suppliers.forEach((supplier) => {
    if (supplier.importedEmail) {
      supplierEmailMap.set(
        supplier.importedEmail.toLowerCase(),
        supplier
      );
    }

    supplierSlugMap.set(supplier.slug, supplier);
  });

  const companySlugMap = new Map();

  companies.forEach((company) => {
    companySlugMap.set(company.slug, company);
  });

  // -----------------------------
  // Excel Duplicate Tracking
  // -----------------------------
  const excelEmails = new Set();
  const excelSlugs = new Set();

  // -----------------------------
  // Results
  // -----------------------------
  const previewRows = [];

  let ready = 0;
  let update = 0;
  let duplicate = 0;
  let invalid = 0;

  // -----------------------------
  // Validate Rows
  // -----------------------------
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    const companyName =
      row["Company Name"]?.trim() || "";

    const email =
      row["Email"]?.trim().toLowerCase() || "";

    const slug = slugify(companyName, {
      lower: true,
      strict: true,
    });

    let status = "READY";
    let error = null;

    // Required
    if (!companyName) {
      status = "INVALID";
      error = "Company Name is required";
    }

    else if (!email) {
      status = "INVALID";
      error = "Email is required";
    }

    else if (excelEmails.has(email)) {
      status = "DUPLICATE";
      error = "Duplicate email in uploaded Excel";
    }

    else if (excelSlugs.has(slug)) {
      status = "DUPLICATE";
      error = "Duplicate company in uploaded Excel";
    }

    else if (
      supplierEmailMap.has(email) ||
      supplierSlugMap.has(slug)
    ) {
      status = "UPDATE";
      error = "Supplier already exists";
    }

    else if (companySlugMap.has(slug)) {
      status = "UPDATE";
      error = "Company already exists";
    }

    excelEmails.add(email);
    excelSlugs.add(slug);

    switch (status) {
      case "READY":
        ready++;
        break;

      case "UPDATE":
        update++;
        break;

      case "DUPLICATE":
        duplicate++;
        break;

      case "INVALID":
        invalid++;
        break;
    }

    previewRows.push({
      rowNumber: index + 2,

      companyName,

      slug,

      email,

      phoneNumber: row["Phone"]?.trim() || "",

      website: row["Website"]?.trim() || "",

      description: row["Description"]?.trim() || "",

      status,

      error,

      existingUser: userMap.has(email),

      existingSupplier:
        supplierEmailMap.has(email) ||
        supplierSlugMap.has(slug),

      existingCompany:
        companySlugMap.has(slug),
    });
  }

  return {
    total: rows.length,

    ready,

    update,

    duplicate,

    invalid,

    rows: previewRows,
  };
}