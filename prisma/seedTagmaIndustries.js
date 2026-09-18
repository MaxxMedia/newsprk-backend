import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import prisma from "../src/prismaClient.js";
import slugify from "slugify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "tagmaIndustryPaths.txt");
const PARENT_NAME = "TAGMA Categories";

function normalizeKey(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseUniqueNames(raw) {
  const seen = new Set();
  const names = [];

  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const collapsed = line.replace(/\s+/g, " ").trim();
    if (!collapsed) continue;

    const key = normalizeKey(collapsed);
    if (!seen.has(key)) {
      seen.add(key);
      names.push(collapsed);
    }
  }

  return names;
}

async function uniqueSlug(name, usedSlugs) {
  const base = slugify(name, { lower: true, strict: true }).slice(0, 70) || "industry";
  let slug = base;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix++}`.slice(0, 80);
  }
  usedSlugs.add(slug);
  return slug;
}

async function main() {
  const raw = readFileSync(DATA_FILE, "utf8");
  const names = parseUniqueNames(raw);

  console.log(`Unique TAGMA industry names in file: ${names.length}`);

  const existing = await prisma.industry.findMany({
    select: { name: true, slug: true },
  });

  const existingNames = new Set(existing.map((row) => normalizeKey(row.name)));
  const usedSlugs = new Set(existing.map((row) => row.slug));

  let parent = await prisma.industry.findFirst({
    where: { name: { equals: PARENT_NAME, mode: "insensitive" } },
  });

  if (!parent) {
    parent = await prisma.industry.create({
      data: {
        name: PARENT_NAME,
        slug: await uniqueSlug(PARENT_NAME, usedSlugs),
      },
    });
    console.log(`Created parent: ${parent.name}`);
  } else {
    console.log(`Using existing parent: ${parent.name}`);
  }

  let createdCount = 0;
  let skippedCount = 0;

  for (const name of names) {
    const key = normalizeKey(name);
    if (existingNames.has(key)) {
      skippedCount += 1;
      continue;
    }

    await prisma.industry.create({
      data: {
        name: name.slice(0, 500),
        slug: await uniqueSlug(name, usedSlugs),
        parentId: parent.id,
      },
    });

    existingNames.add(key);
    createdCount += 1;
    if (createdCount <= 40 || createdCount % 50 === 0) {
      console.log(`Created: ${name.slice(0, 90)}`);
    }
  }

  const total = await prisma.industry.count();
  console.log("-----");
  console.log(`Created: ${createdCount}`);
  console.log(`Already existed: ${skippedCount}`);
  console.log(`Total industries in database: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
