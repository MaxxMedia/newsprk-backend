import prisma from "../src/prismaClient.js";
import slugify from "slugify";

/* ======================================
   Latest Excel / supplier categories only.
   Existing industries are never duplicated.
====================================== */
const latestIndustries = [
  "Fume Extractor",
  "Oil Mist Collector",
  "CNC Turret Sleeves",
  "CNC for Other Machines",
  "Measuring Machines",
  "Profile Projector",
  "Oilless Bushes",
  "Roller Burnishing Tools",
  "Conveying Equipment and Systems",
  "Lubrication and Coolant",
  "Microscopes",
  "Hardness Tester",
  "Organisations",
  "Lubrication System & Spares Accessories",
  "Dust Collectors",
  "Vacuum Cleaners",
  "Blower",
  "Inserts Clamping Screws",
  "Cemented Carbide Material & Tools",
];

async function uniqueSlug(name, usedSlugs) {
  const base = slugify(name, { lower: true, strict: true }) || "industry";
  let slug = base;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix++}`;
  }
  usedSlugs.add(slug);
  return slug;
}

async function main() {
  const existing = await prisma.industry.findMany({
    select: { name: true, slug: true },
  });

  const existingNames = new Set(existing.map((row) => row.name.trim().toLowerCase()));
  const usedSlugs = new Set(existing.map((row) => row.slug));

  let parent = await prisma.industry.findFirst({
    where: { name: { equals: "Supplier Directory Categories", mode: "insensitive" } },
  });

  if (!parent) {
    parent = await prisma.industry.create({
      data: {
        name: "Supplier Directory Categories",
        slug: await uniqueSlug("Supplier Directory Categories", usedSlugs),
      },
    });
    console.log(`Created parent: ${parent.name}`);
  } else {
    console.log(`Using existing parent: ${parent.name}`);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const name of latestIndustries) {
    const key = name.trim().toLowerCase();
    if (existingNames.has(key)) {
      skippedCount += 1;
      console.log(`Skip (already exists): ${name}`);
      continue;
    }

    await prisma.industry.create({
      data: {
        name,
        slug: await uniqueSlug(name, usedSlugs),
        parentId: parent.id,
      },
    });
    existingNames.add(key);
    createdCount += 1;
    console.log(`Created: ${name}`);
  }

  const total = await prisma.industry.count();
  console.log("-----");
  console.log(`Created: ${createdCount}`);
  console.log(`Already existed: ${skippedCount}`);
  console.log(`Total industries in database: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
