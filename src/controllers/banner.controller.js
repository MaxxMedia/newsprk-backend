import prisma from "../prismaClient.js";

/**
 * CREATE BANNER (ADMIN)
 */
export const createBanner = async (req, res) => {
  try {
    const {
      title,
      imageUrl,
      targetUrl,
      placement,
      status,
      startDate,
      endDate,
    } = req.body;

    if (!title || !imageUrl || !placement) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // 🔥 GET LAST POSITION FOR THIS PLACEMENT
    const lastBanner = await prisma.advertisementBanner.findFirst({
      where: { placement },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const nextPosition = lastBanner ? lastBanner.position + 1 : 0;

    const banner = await prisma.advertisementBanner.create({
    data: {
    title,
    imageUrl,
    targetUrl,
    placement,
    status,
    startDate,
    endDate,
    position: nextPosition,
    createdById: req.user.id,
    updatedAt: new Date(),
  },
});

    res.status(201).json(banner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create banner" });
  }
};


/**
 * GET ACTIVE BANNERS BY PLACEMENT (PUBLIC)
 */
export const getBannersByPlacement = async (req, res) => {
  try {
    const { placement } = req.query;

    if (!placement) {
      return res.status(400).json({ message: "Placement required" });
    }

    const now = new Date();

    const banners = await prisma.advertisementBanner.findMany({
      where: {
        placement,
        status: "ACTIVE",
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: now } }] },
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
        ],
      },
      orderBy: {
        position: "asc", // ✅ THIS IS THE KEY
      },
    });

    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch banners" });
  }
};


/**
 * GET ALL BANNERS (ADMIN)
 */
export const getAllBanners = async (req, res) => {
  try {
    const banners = await prisma.advertisementBanner.findMany({
      include: {
        User: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(banners);
  } catch (error) {
    console.error("GET ALL BANNERS ERROR:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * UPDATE BANNER (ADMIN)
 */
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await prisma.advertisementBanner.update({
      where: { id: Number(id) },
      data: req.body,
    });

    res.json(banner);
  } catch (error) {
    res.status(500).json({ message: "Failed to update banner" });
  }
};

export const updateBannerOrder = async (req, res) => {
  try {
    const updates = req.body; // [{ id, position }]

    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    await prisma.$transaction(
      updates.map((b) =>
        prisma.advertisementBanner.update({
          where: { id: b.id },
          data: { position: b.position },
        })
      )
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update banner order" });
  }
};



/**
 * DELETE BANNER (ADMIN)
 */
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.advertisementBanner.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Banner deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete banner" });
  }
};

/**
 * TRACK IMPRESSION
 */
export const trackImpression = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.advertisementBanner.update({
      where: { id: Number(id) },
      data: {
        impressions: { increment: 1 },
      },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};

/**
 * TRACK CLICK
 */
export const trackClick = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await prisma.advertisementBanner.update({
      where: { id: Number(id) },
      data: {
        clicks: { increment: 1 },
      },
    });

    res.redirect(banner.targetUrl || "/");
  } catch (error) {
    res.status(500).json({ success: false });
  }
};


/**
 * GET SINGLE BANNER (ADMIN)
 */
export const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await prisma.advertisementBanner.findUnique({
      where: { id: Number(id) },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    if (!banner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.json(banner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch banner" });
  }
};