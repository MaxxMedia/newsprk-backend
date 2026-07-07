import { prisma } from "../lib/prisma.js";
import slugify from "slugify";
import { filterJobsForPackageVisibility, enforceCompanyJobVisibility } from "../lib/jobVisibility.js";

/**
 * Recruiter creates company
 */
export async function createCompany(req, res) {
  try {
    const { name, logoUrl, website, description, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Company name is required" });
    }

    // ✅ Generate LinkedIn-style slug
    const baseSlug = slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });

    let slug = baseSlug;
    let count = 1;

    while (await prisma.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const company = await prisma.company.create({
      data: {
        name,
        slug, // ✅ REQUIRED
        logoUrl,
        website,
        description,
        location,
      },
    });

    if (req.user?.role === "recruiter" && !req.user.companyId) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          companyId: company.id,
          isOnboarded: true,
        },
      });
    }

    res.json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Company creation failed" });
  }
}

/**
 * Public: list companies
 */
export async function getAllCompanies(req, res) {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
}

/**
 * Admin: verify company
 */
export async function verifyCompany(req, res) {
  try {
    const company = await prisma.company.update({
      where: { id: Number(req.params.id) },
      data: { isVerified: true },
    });

    res.json(company);
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
}

/**
 * Public: get company profile by slug
 */
export async function getCompanyBySlug(req, res) {
  try {
    const { slug } = req.params;

  const company = await prisma.company.findUnique({
  where: { slug },
  include: {
    Job: {
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        location: true,
        employmentType: true,
        isRemote: true,
        createdAt: true,
      },
    },
    _count: {
      select: {
        CompanyFollower: true,
      },
    },
  },
})

if (!company) {
  return res.status(404).json({ error: "Company not found" })
}

await enforceCompanyJobVisibility(company.id)

const activeJobs = await prisma.job.findMany({
  where: {
    companyId: company.id,
    isActive: true,
    isExternal: false,
  },
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    title: true,
    slug: true,
    location: true,
    employmentType: true,
    isRemote: true,
    createdAt: true,
    companyId: true,
    isExternal: true,
  },
})

const visibleJobs = await filterJobsForPackageVisibility(activeJobs)

res.json({
  ...company,
  jobs: visibleJobs,
  followers: company._count.CompanyFollower,
})
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch company profile" });
  }
}

/**
 * Public: get company people (recruiters)
 */
export async function getCompanyPeople(req, res) {
  try {
    const { slug } = req.params;

    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    const peopleMap = new Map();
    const profileSelect = {
      id: true,
      username: true,
      fullName: true,
      headline: true,
      location: true,
      avatarUrl: true,
      role: true,
    };

    const companyRecruiters = await prisma.user.findMany({
      where: {
        companyId: company.id,
        role: "recruiter",
      },
      select: profileSelect,
    });

    companyRecruiters.forEach((user) => {
      peopleMap.set(user.id, { ...user, relation: "team" });
    });

    const jobPosters = await prisma.job.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      select: {
        User: { select: profileSelect },
      },
    });

    jobPosters.forEach(({ User }) => {
      if (User) peopleMap.set(User.id, { ...User, relation: "team" });
    });

    const followers = await prisma.companyFollower.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      include: {
        User: { select: profileSelect },
      },
    });

    followers.forEach(({ User, createdAt }) => {
      if (User && !peopleMap.has(User.id)) {
        peopleMap.set(User.id, {
          ...User,
          relation: "follower",
          followingSince: createdAt,
        });
      }
    });

    res.json(Array.from(peopleMap.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch company people" });
  }
}

/**
 * Follow company
 */
export async function followCompany(req, res) {
  try {
    const { companyId } = req.params;
    const userId = req.user.id; // Use 'id' from your JWT token

    // Convert to numbers
    const companyIdNum = parseInt(companyId);
    const userIdNum = parseInt(userId);

    await prisma.companyFollower.create({
      data: {
        companyId: companyIdNum,
        userId: userIdNum,
      },
    });

    res.json({ success: true });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Already following" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to follow company" });
  }
}

/**
 * Unfollow company
 */
export async function unfollowCompany(req, res) {
  try {
    const { companyId } = req.params;
    const userId = req.user.id; // Use 'id' from your JWT token

    // Convert to numbers
    const companyIdNum = parseInt(companyId);
    const userIdNum = parseInt(userId);

    await prisma.companyFollower.delete({
      where: {
        companyId_userId: {
          companyId: companyIdNum,
          userId: userIdNum,
        },
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unfollow company" });
  }
}

/**
 * Check if user is following a company
 */
export async function getFollowStatus(req, res) {
  try {
    const { companyId } = req.params;
    const userId = req.user.id;

    const follow = await prisma.companyFollower.findUnique({
      where: {
        companyId_userId: {
          companyId: parseInt(companyId),
          userId: parseInt(userId),
        },
      },
    });

    res.json({ isFollowing: !!follow });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check follow status" });
  }
}

/**
 * ADMIN: Create company
 */
export async function adminCreateCompany(req, res) {
  try {
    if (req.user.role?.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const { name, logoUrl, website, description, location } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Company name is required" });
    }

    const baseSlug = slugify(name, {
      lower: true,
      strict: true,
      trim: true,
    });

    let slug = baseSlug;
    let count = 1;

    while (await prisma.company.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count++}`;
    }

    const company = await prisma.company.create({
      data: {
        name,
        slug,
        logoUrl,
        website,
        description,
        location,
        isVerified: true, // auto verified
      },
    });

    res.status(201).json(company);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Admin company creation failed" });
  }
}