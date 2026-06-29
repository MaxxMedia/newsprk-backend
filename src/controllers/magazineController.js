import { prisma } from "../lib/prisma.js";
import slugify from "slugify";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const MAIL_FROM = process.env.MAIL_FROM;

/* ======================================================
   CREATE MAGAZINE (ADMIN)
====================================================== */
export const createMagazine = async (req, res) => {
  console.log("🔥 CREATE MAGAZINE ROUTE HIT");
console.log(req.body);
console.log(req.user);
  try {
    const {
      title,
      description,
      coverImageUrl,
      pdfUrl,
      flipbookPages,
      coverStoryId,
      authorId,
      status,
    } = req.body;

    if (!title || !pdfUrl) {
      return res.status(400).json({
        error: "Title and PDF are required",
      });
    }

    let baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;

    const existing = await prisma.magazine.findUnique({
      
      where: { slug },
      
    });

    

    if (existing) {
      slug = `${baseSlug}-${Date.now()}`;
    }
    

    const magazine = await prisma.magazine.create({
  data: {
    title,
    slug,
    description,
    coverImageUrl,
    pdfUrl,
    flipbookPages,
    coverStoryId: coverStoryId ? Number(coverStoryId) : null,
    authorId: authorId ? Number(authorId) : null,
    status: status || "DRAFT",
    createdById: req.user.id,
    publishedAt: status === "PUBLISHED" ? new Date() : null,

    // REQUIRED
    updatedAt: new Date(),
  },
  include: {
    CoverStory: true,
    MagazineAuthor: true,
  },
});

console.log("✅ MAGAZINE CREATED:", magazine);


    res.status(201).json(magazine);
  } catch (error) {
    console.error("CREATE MAGAZINE ERROR:", error);
    res.status(500).json({ error: "Failed to create magazine" });
  }
};

/* ======================================================
   UPDATE MAGAZINE (ADMIN)
====================================================== */
export const updateMagazine = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.magazine.update({
  where: { id },
  data: {
    title,
    description,
    coverImageUrl,
    pdfUrl,
    flipbookPages,
    coverStoryId,
    authorId,
    status,
    updatedAt: new Date(),
  }
})

    res.json(magazine);
  } catch (error) {
    res.status(500).json({ error: "Failed to update magazine" });
  }
};

/* ======================================================
   DELETE MAGAZINE (ADMIN)
====================================================== */
export const deleteMagazine = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.magazine.delete({
      where: { id: Number(id) },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete magazine" });
  }
};

/* ======================================================
   GET ALL PUBLISHED MAGAZINES (PUBLIC)
====================================================== */
export const getAllMagazines = async (req, res) => {
  try {
    const magazines = await prisma.magazine.findMany({
      where: { status: "PUBLISHED" },
      include: {
        CoverStory: true,
        MagazineAuthor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = magazines.map((m) => ({
      ...m,
      coverStory: m.CoverStory,
      author: m.MagazineAuthor,
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to fetch magazines",
    });
  }
};

/* ======================================================
   GET SINGLE MAGAZINE (PUBLIC)
====================================================== */
export const getSingleMagazine = async (req, res) => {
  try {
    const { slug } = req.params;

   const magazine = await prisma.magazine.findUnique({
  where: { slug },
  include: {
    CoverStory: true,
    MagazineAuthor: true,
  },
});

res.json({
  ...magazine,
  coverStory: magazine.CoverStory,
  author: magazine.MagazineAuthor,
});

    if (!magazine || magazine.status !== "PUBLISHED") {
      return res.status(404).json({ error: "Magazine not found" });
    }

    res.json(magazine);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch magazine" });
  }
};

/* ======================================================
   REGISTER FOR MAGAZINE + EMAIL (PUBLIC)
====================================================== */
export const registerMagazine = async (req, res) => {
  try {
    const { magazineId } = req.params;
    const { firstName, lastName, email, companyName, jobTitle, country } =
      req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: "First name, last name and email are required",
      });
    }

    const magazine = await prisma.magazine.findUnique({
      where: { id: Number(magazineId) },
    });

    if (!magazine || magazine.status !== "PUBLISHED") {
      return res.status(404).json({
        error: "Magazine not available",
      });
    }

    const existing = await prisma.magazineRegistration.findFirst({
      where: {
        magazineId: Number(magazineId),
        email,
      },
    });

    if (existing) {
      return res.status(400).json({
        error: "You already registered for this magazine",
      });
    }

    await prisma.magazineRegistration.create({
      data: {
        magazineId: magazine.id,
        firstName,
        lastName,
        email,
        companyName,
        jobTitle,
        country,
      },
    });

    await resend.emails.send({
      from: `MoldMaking Technology <${MAIL_FROM}>`,
      to: email,
      subject: `Your Digital Magazine - ${magazine.title}`,
      html: `
        <h2>Hello ${firstName},</h2>
        <p>Attached is your digital magazine.</p>
        <p>Thank you for registering.</p>
      `,
      attachments: [
        {
          filename: `${magazine.title}.pdf`,
          path: magazine.pdfUrl,
        },
      ],
    });

    res.json({ success: true });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

/* ======================================================
   GET MAGAZINE REGISTRATIONS (ADMIN)
====================================================== */
export const getMagazineRegistrations = async (req, res) => {
  try {
    const { id } = req.params;

    const registrations = await prisma.magazineRegistration.findMany({
      where: { magazineId: Number(id) },
      orderBy: { createdAt: "desc" },
    });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
};

/* ======================================================
   GET CREATION DROPDOWN DATA (ADMIN)
====================================================== */
export const getMagazineCreationData = async (req, res) => {
  try {
    const [authors, coverStories] = await Promise.all([
      prisma.magazineAuthor.findMany(),
      prisma.coverStory.findMany({
        include: { author: true },
      }),
    ]);

    res.json({ authors, coverStories });
  } catch (error) {
    res.status(500).json({ error: "Failed to load creation data" });
  }
};


/* ======================================================
   CREATE MAGAZINE AUTHOR (ADMIN)
====================================================== */
export const createMagazineAuthor = async (req, res) => {
  try {
    const { name, profileImageUrl, designation, linkedinUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Author name required" });
    }

    const author = await prisma.magazineAuthor.create({
      data: {
        name,
        profileImageUrl,
        designation,
        linkedinUrl,
      },
    });

    res.status(201).json(author);
  } catch (error) {
    console.error("CREATE AUTHOR ERROR:", error);
    res.status(500).json({ error: "Failed to create author" });
  }
};

/* ======================================================
   GET ALL AUTHORS
====================================================== */
export const getAllMagazineAuthors = async (req, res) => {
  try {
    const authors = await prisma.magazineAuthor.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json(authors);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch authors" });
  }
};

/* ======================================================
   CREATE COVER STORY (ADMIN)
====================================================== */
export const createCoverStory = async (req, res) => {
  try {
    const {
      title,
      shortDescription,
      keyCategories,
      imageBrief,
      fullDescription,
      badge,
      coverImageUrl,
      slugImageUrls,
      authorId,
    } = req.body;

    if (!title || !fullDescription) {
      return res.status(400).json({
        error: "Title and Full Description required",
      });
    }

    let baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;

    const existing = await prisma.coverStory.findUnique({
      where: { slug },
    });

    if (existing) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    const coverStory = await prisma.coverStory.create({
      data: {
        title,
        slug,
        shortDescription,
        keyCategories,
        imageBrief,
        fullDescription,
        badge,
        coverImageUrl,
        slugImageUrls,
        authorId: authorId ? Number(authorId) : null,
      },
      include: {
        MagazineAuthor: true,
      },
    });

    res.status(201).json(coverStory);
  } catch (error) {
    console.error("CREATE COVER STORY ERROR:", error);
    res.status(500).json({ error: "Failed to create cover story" });
  }
};

/* ======================================================
   GET ALL COVER STORIES
====================================================== */
export const getAllCoverStories = async (req, res) => {
  try {
    const stories = await prisma.coverStory.findMany({
      include: {
        MagazineAuthor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(stories);
  } catch (error) {
  console.error("GET COVER STORIES ERROR:", error);
  res.status(500).json({
    error: error.message,
  });
}
};

/* ======================================================
   GET SINGLE COVER STORY (PUBLIC)
====================================================== */
export const getSingleCoverStory = async (req, res) => {
  try {
    const { slug } = req.params;

    const story = await prisma.coverStory.findUnique({
      where: { slug },
      include: {
        author: true,
      },
    });

    if (!story) {
      return res.status(404).json({ error: "Cover story not found" });
    }

    res.json(story);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cover story" });
  }
};

export const getAllMagazinesAdmin = async (req, res) => {
  try {
    const magazines = await prisma.magazine.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        MagazineAuthor: true,
        CoverStory: true,
      },
    })

    res.json(magazines)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
