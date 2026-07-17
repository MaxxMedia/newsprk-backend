import slugify from "slugify";
import prisma from "../prismaClient.js";

export async function validateSuppliers(rows) {
  const validRows = [];
  const errors = [];

  const usedEmails = new Set();
  const usedSlugs = new Set();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    const companyName = row["Company Name"]?.trim();
    const email = row["Email"]?.trim().toLowerCase();
    const phone = row["Phone"]?.trim();
    const website = row["Website"]?.trim();
    const description = row["Description"]?.trim();

    // Generate slug
    const slug = slugify(companyName || "", {
      lower: true,
      strict: true,
    });

    /* -----------------------------
       Required Fields
    ------------------------------ */

    if (!companyName) {
      errors.push({
        row: index + 2,
        error: "Company Name is required",
      });
      continue;
    }

    if (!email) {
      errors.push({
        row: index + 2,
        company: companyName,
        error: "Email is required",
      });
      continue;
    }

    /* -----------------------------
       Email Validation
    ------------------------------ */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errors.push({
        row: index + 2,
        company: companyName,
        error: "Invalid Email",
      });
      continue;
    }

    /* -----------------------------
       Duplicate Email in Excel
    ------------------------------ */

    if (usedEmails.has(email)) {
      errors.push({
        row: index + 2,
        company: companyName,
        error: "Duplicate Email in Excel",
      });
      continue;
    }

    usedEmails.add(email);

    /* -----------------------------
       Duplicate Slug in Excel
    ------------------------------ */

    if (usedSlugs.has(slug)) {
      errors.push({
        row: index + 2,
        company: companyName,
        error: "Duplicate Company Name",
      });
      continue;
    }

    usedSlugs.add(slug);

    /* -----------------------------
       Existing Supplier
    ------------------------------ */

    const supplier =
      await prisma.supplierDirectory.findUnique({
        where: {
          slug,
        },
      });

    if (supplier) {
      errors.push({
        row: index + 2,
        company: companyName,
        error: "Supplier already exists",
      });
      continue;
    }

    /* -----------------------------
       Existing User
    ------------------------------ */

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    validRows.push({
      companyName,
      slug,

      email,
      phone,
      website,
      description,

      userId: user?.id || null,
      companyId: user?.companyId || null,

      claimed: !!user,
    });
  }

  return {
    total: rows.length,
    valid: validRows.length,
    invalid: errors.length,

    validRows,
    errors,
  };
}