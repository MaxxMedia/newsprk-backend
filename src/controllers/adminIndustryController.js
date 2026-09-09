import prisma from "../prismaClient.js";
import slugify from "slugify";

function serializeIndustry(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    createdAt: row.createdAt,
    parent: row.Industry
      ? { id: row.Industry.id, name: row.Industry.name, slug: row.Industry.slug }
      : null,
    childrenCount: row._count?.other_Industry ?? 0,
    companiesCount: row._count?.Company ?? 0,
    talksCount: row._count?.IndustryTalk ?? 0,
  };
}

const industryInclude = {
  Industry: { select: { id: true, name: true, slug: true } },
  _count: {
    select: {
      other_Industry: true,
      Company: true,
      IndustryTalk: true,
    },
  },
};

async function makeUniqueSlug(base, excludeId = null) {
  const normalized = slugify(base, { lower: true, strict: true }) || "industry";
  let slug = normalized;
  let n = 0;

  while (true) {
    const existing = await prisma.industry.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${normalized}-${n}`;
  }
}

async function wouldCreateCycle(industryId, newParentId) {
  if (!newParentId) return false;
  if (Number(newParentId) === Number(industryId)) return true;

  let currentId = Number(newParentId);
  const seen = new Set();

  while (currentId) {
    if (currentId === Number(industryId)) return true;
    if (seen.has(currentId)) break;
    seen.add(currentId);

    const parent = await prisma.industry.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    currentId = parent?.parentId ?? null;
  }

  return false;
}

/* =========================================
   GET ROOT INDUSTRIES (parentId = null)
========================================= */
export async function getIndustryTree(req, res) {
  try {
    const industries = await prisma.industry.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
    });

    res.json(industries);
  } catch (error) {
    console.error("GET INDUSTRIES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch industries" });
  }
}

/* =========================================
   GET CHILDREN OF A SPECIFIC INDUSTRY
========================================= */
export async function getIndustryChildren(req, res) {
  try {
    const { id } = req.params;

    const children = await prisma.industry.findMany({
      where: { parentId: Number(id) },
      orderBy: { name: "asc" },
    });

    res.json(children);
  } catch (error) {
    console.error("GET INDUSTRY CHILDREN ERROR:", error);
    res.status(500).json({ error: "Failed to fetch industry children" });
  }
}

/* =========================================
   PAGINATED ADMIN LIST
========================================= */
export async function listIndustries(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || "").trim();
    const parentId = req.query.parentId;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    if (parentId === "root") {
      where.parentId = null;
    } else if (parentId !== undefined && parentId !== "" && parentId !== "all") {
      const parsed = Number(parentId);
      if (!Number.isNaN(parsed)) where.parentId = parsed;
    }

    const [total, rows] = await Promise.all([
      prisma.industry.count({ where }),
      prisma.industry.findMany({
        where,
        include: industryInclude,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({
      data: rows.map(serializeIndustry),
      meta: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error("LIST INDUSTRIES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch industries" });
  }
}

/* =========================================
   LIST TOP-LEVEL PARENT INDUSTRIES
========================================= */
export async function listParentIndustries(req, res) {
  try {
    const industries = await prisma.industry.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    res.json(industries);
  } catch (error) {
    console.error("LIST PARENT INDUSTRIES ERROR:", error);
    res.status(500).json({ error: "Failed to fetch parent industries" });
  }
}

/* =========================================
   GET ONE INDUSTRY (ADMIN)
========================================= */
export async function getIndustryById(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid industry id" });

    const row = await prisma.industry.findUnique({
      where: { id },
      include: industryInclude,
    });

    if (!row) return res.status(404).json({ error: "Industry not found" });

    res.json(serializeIndustry(row));
  } catch (error) {
    console.error("GET INDUSTRY ERROR:", error);
    res.status(500).json({ error: "Failed to fetch industry" });
  }
}

/* =========================================
   CREATE INDUSTRY
========================================= */
export async function createIndustry(req, res) {
  const { name, parentId } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Industry name is required" });
  }

  try {
    const parsedParentId =
      parentId === undefined || parentId === null || parentId === ""
        ? null
        : Number(parentId);

    if (parsedParentId) {
      const parent = await prisma.industry.findUnique({
        where: { id: parsedParentId },
        select: { id: true },
      });
      if (!parent) {
        return res.status(400).json({ error: "Parent industry not found" });
      }
    }

    const slug = await makeUniqueSlug(String(name).trim());

    const industry = await prisma.industry.create({
      data: {
        name: String(name).trim(),
        slug,
        parentId: parsedParentId,
      },
      include: industryInclude,
    });

    res.status(201).json(serializeIndustry(industry));
  } catch (error) {
    console.error("CREATE INDUSTRY ERROR:", error);
    res.status(500).json({ error: "Failed to create industry" });
  }
}

/* =========================================
   UPDATE INDUSTRY
========================================= */
export async function updateIndustry(req, res) {
  const id = Number(req.params.id);
  const { name, parentId } = req.body;

  if (!id) return res.status(400).json({ error: "Invalid industry id" });

  try {
    const existing = await prisma.industry.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Industry not found" });

    const data = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: "Industry name is required" });
      }
      data.name = String(name).trim();
      data.slug = await makeUniqueSlug(data.name, id);
    }

    if (parentId !== undefined) {
      const parsedParentId =
        parentId === null || parentId === "" ? null : Number(parentId);

      if (parsedParentId) {
        const parent = await prisma.industry.findUnique({
          where: { id: parsedParentId },
          select: { id: true },
        });
        if (!parent) {
          return res.status(400).json({ error: "Parent industry not found" });
        }
        if (await wouldCreateCycle(id, parsedParentId)) {
          return res.status(400).json({
            error: "An industry cannot be nested under itself or its children",
          });
        }
      }

      data.parentId = parsedParentId;
    }

    const industry = await prisma.industry.update({
      where: { id },
      data,
      include: industryInclude,
    });

    res.json(serializeIndustry(industry));
  } catch (error) {
    console.error("UPDATE INDUSTRY ERROR:", error);
    res.status(500).json({ error: "Failed to update industry" });
  }
}

/* =========================================
   DELETE INDUSTRY
========================================= */
export async function deleteIndustry(req, res) {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid industry id" });

  try {
    const existing = await prisma.industry.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            other_Industry: true,
            Company: true,
            IndustryTalk: true,
          },
        },
      },
    });

    if (!existing) return res.status(404).json({ error: "Industry not found" });

    if (existing._count.other_Industry > 0) {
      return res.status(400).json({
        error: `Cannot delete: this industry has ${existing._count.other_Industry} child industries`,
      });
    }

    if (existing._count.Company > 0) {
      return res.status(400).json({
        error: `Cannot delete: ${existing._count.Company} companies are linked to this industry`,
      });
    }

    if (existing._count.IndustryTalk > 0) {
      return res.status(400).json({
        error: `Cannot delete: ${existing._count.IndustryTalk} industry talks are linked to this industry`,
      });
    }

    await prisma.industry.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error("DELETE INDUSTRY ERROR:", error);
    res.status(500).json({ error: "Failed to delete industry" });
  }
}
