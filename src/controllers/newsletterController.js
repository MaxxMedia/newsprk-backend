import { prisma } from "../lib/prisma.js";

import { resend } from "../lib/resend.js";
import { newsletterHtml } from "../lib/newsletterEmail.js";

/* ===========================
   PUBLIC
=========================== */

export async function subscribeNewsletter(req, res) {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      companyName,
      frequency,
      emailSubscribed,
      whatsappSubscribed,
      smsSubscribed,
    } = req.body;

    // ===============================
    // Validation
    // ===============================

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "Email or phone number is required.",
      });
    }

    // ===============================
    // Already Exists?
    // ===============================

    const existing = await prisma.newsletterSubscriber.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phoneNumber ? { phoneNumber } : {},
        ],
      },
    });

    if (existing) {
      return res.status(409).json({
        error: "Already subscribed.",
      });
    }

    // ===============================
    // Create Subscriber
    // ===============================

    const subscriber =
      await prisma.newsletterSubscriber.create({
        data: {
          fullName,
          email,
          phoneNumber,
          companyName,

          source: "NEWSLETTER_FORM",

          frequency:
            frequency || "MONTHLY",

          emailSubscribed:
            emailSubscribed ?? true,

          whatsappSubscribed:
            whatsappSubscribed ?? false,

          smsSubscribed:
            smsSubscribed ?? false,
        },
      });

    return res.status(201).json({
      success: true,
      message: "Subscribed successfully.",
      subscriber,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to subscribe.",
    });
  }
}

export async function unsubscribeNewsletter(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required.",
      });
    }

    const subscriber =
      await prisma.newsletterSubscriber.findUnique({
        where: {
          email,
        },
      });

    if (!subscriber) {
      return res.status(404).json({
        error: "Subscriber not found.",
      });
    }

    await prisma.newsletterSubscriber.update({
      where: {
        id: subscriber.id,
      },
      data: {
        status: "UNSUBSCRIBED",
      },
    });

    res.json({
      success: true,
      message: "Successfully unsubscribed.",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to unsubscribe.",
    });
  }
}

/* ===========================
   SUBSCRIBERS
=========================== */

export async function getSubscribers(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = req.query.search || "";
    const status = req.query.status || "";
    const source = req.query.source || "";

    const where = {};

    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
          },
        },
        {
          companyName: {
            contains: search,
          },
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscriber.findMany({
        where,

        include: {
          Company: true,
          User: true,
        },

        orderBy: {
          createdAt: "desc",
        },

        skip: (page - 1) * limit,

        take: limit,
      }),

      prisma.newsletterSubscriber.count({
        where,
      }),
    ]);

    res.json({
      subscribers,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to load subscribers.",
    });
  }
}

export async function getSubscriber(req, res) {
  try {
    const id = Number(req.params.id);

    const subscriber =
      await prisma.newsletterSubscriber.findUnique({
        where: {
          id,
        },

        include: {
          Company: true,
          User: true,
        },
      });

    if (!subscriber) {
      return res.status(404).json({
        error: "Subscriber not found.",
      });
    }

    res.json(subscriber);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to load subscriber.",
    });
  }
}

export async function createSubscriber(req, res) {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      companyName,
      frequency,
      emailSubscribed,
      whatsappSubscribed,
      smsSubscribed,
    } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        error: "Email or Phone is required.",
      });
    }

    const exists =
      await prisma.newsletterSubscriber.findFirst({
        where: {
          OR: [
            email ? { email } : {},
            phoneNumber ? { phoneNumber } : {},
          ],
        },
      });

    if (exists) {
      return res.status(409).json({
        error: "Subscriber already exists.",
      });
    }

    const subscriber =
      await prisma.newsletterSubscriber.create({
        data: {
          fullName,
          email,
          phoneNumber,
          companyName,

          source: "ADMIN",

          frequency:
            frequency || "MONTHLY",

          emailSubscribed:
            emailSubscribed ?? true,

          whatsappSubscribed:
            whatsappSubscribed ?? false,

          smsSubscribed:
            smsSubscribed ?? false,
        },
      });

    res.status(201).json(subscriber);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to create subscriber.",
    });
  }
}

export async function updateSubscriber(req, res) {
  try {
    const id = Number(req.params.id);

    const subscriber =
      await prisma.newsletterSubscriber.update({
        where: {
          id,
        },

        data: req.body,
      });

    res.json(subscriber);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to update subscriber.",
    });
  }
}

export async function deleteSubscriber(req, res) {
  try {
    const id = Number(req.params.id);

    await prisma.newsletterSubscriber.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to delete subscriber.",
    });
  }
}

/* ===========================
   CAMPAIGNS
=========================== */

export async function getCampaigns(req, res) {
  try {
    const campaigns =
      await prisma.newsletterCampaign.findMany({
        include: {
          User: true,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    res.json(campaigns);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to load campaigns.",
    });
  }
}

export async function getCampaign(req, res) {
  try {
    const id = Number(req.params.id);

    const campaign =
      await prisma.newsletterCampaign.findUnique({
        where: {
          id,
        },

        include: {
          NewsletterRecipient: true,
        },
      });

    if (!campaign)
      return res.status(404).json({
        error: "Campaign not found.",
      });

    res.json(campaign);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to load campaign.",
    });
  }
}

export async function createCampaign(req, res) {
  try {
    const {
      title,
      subject,
      content,
      coverImage,

      emailEnabled,
      whatsappEnabled,
      smsEnabled,

      frequency,
      scheduledAt,
    } = req.body;

    if (!title)
      return res.status(400).json({
        error: "Campaign title is required.",
      });

    if (!subject)
      return res.status(400).json({
        error: "Subject is required.",
      });

    if (!content)
      return res.status(400).json({
        error: "Content is required.",
      });

    const campaign =
      await prisma.newsletterCampaign.create({
        data: {
          title,
          subject,
          content,
          coverImage,

          emailEnabled: emailEnabled ?? true,
          whatsappEnabled: whatsappEnabled ?? false,
          smsEnabled: smsEnabled ?? false,

          frequency,

          scheduledAt:
            scheduledAt ? new Date(scheduledAt) : null,

          status: scheduledAt
            ? "SCHEDULED"
            : "DRAFT",

          createdById: req.user.id,
        },
      });

    res.status(201).json(campaign);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to create campaign.",
    });
  }
}

export async function updateCampaign(req, res) {
  try {
    const id = Number(req.params.id);

    const campaign =
      await prisma.newsletterCampaign.update({
        where: {
          id,
        },

        data: req.body,
      });

    res.json(campaign);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to update campaign.",
    });
  }
}

export async function deleteCampaign(req, res) {
  try {
    const id = Number(req.params.id);

    await prisma.newsletterCampaign.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to delete campaign.",
    });
  }
}

export async function sendCampaign(req, res) {
  try {
    const id = Number(req.params.id);

    const campaign =
      await prisma.newsletterCampaign.findUnique({
        where: {
          id,
        },
      });

    if (!campaign) {
      return res.status(404).json({
        error: "Campaign not found.",
      });
    }

    if (campaign.status === "SENT") {
      return res.status(400).json({
        error: "Campaign already sent.",
      });
    }

    // Load active subscribers
    const subscribers =
      await prisma.newsLetter.findMany({
        where: {
          isActive: true,
        },
      });

    if (!subscribers.length) {
      return res.status(400).json({
        error: "No subscribers found.",
      });
    }

    let emailCount = 0;
    let whatsappCount = 0;
    let smsCount = 0;

   for (const subscriber of subscribers) {

  const recipient =
    await prisma.newsletterRecipient.create({
      data: {
        campaignId: campaign.id,

        newsletterId: subscriber.id,

        email: subscriber.email,

        phone: subscriber.phone,

        status: "PENDING",
      },
    });

  try {

    if (
      campaign.emailEnabled &&
      subscriber.emailEnabled &&
      subscriber.email
    ) {

      await resend.emails.send({

        from: "Newsprk <newsletter@yourdomain.com>",

        to: subscriber.email,

        subject: campaign.subject,

        html: newsletterHtml(campaign),

      });

      await prisma.newsletterRecipient.update({

        where: {
          id: recipient.id,
        },

        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
        },

      });

      emailCount++;
    }

  } catch (err) {

    console.error(err);

    await prisma.newsletterRecipient.update({

      where: {
        id: recipient.id,
      },

      data: {
        status: "FAILED",
        errorMessage: err.message,
      },

    });

  }

}

    const delivered =
  await prisma.newsletterRecipient.count({

    where: {
      campaignId: campaign.id,
      status: "DELIVERED",
    },

  });

const failed =
  await prisma.newsletterRecipient.count({

    where: {
      campaignId: campaign.id,
      status: "FAILED",
    },

  });

await prisma.newsletterCampaign.update({

  where: {
    id: campaign.id,
  },

  data: {

    totalRecipients: subscribers.length,

    delivered,

    failed,

    status: "SENT",

    sentAt: new Date(),

  },

});;

    res.json({
      success: true,

      totalRecipients: subscribers.length,

      emailRecipients: emailCount,

      whatsappRecipients: whatsappCount,

      smsRecipients: smsCount,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Unable to send campaign.",
    });
  }
}
/* ===========================
   ANALYTICS / DASHBOARD
=========================== */

export async function getAnalytics(req, res) {
  try {
    console.log("📊 getAnalytics called by user:", req.user?.id || 'unknown');

    const [
      totalSubscribers,
      activeSubscribers,
      inactiveSubscribers,
      totalCampaigns,
      draftCampaigns,
      scheduledCampaigns,
      sentCampaigns,
    ] = await Promise.all([
      prisma.newsletterSubscriber.count(),
      prisma.newsletterSubscriber.count({
        where: { status: "ACTIVE" },
      }),
      prisma.newsletterSubscriber.count({
        where: { status: "UNSUBSCRIBED" },
      }),
      prisma.newsletterCampaign.count(),
      prisma.newsletterCampaign.count({
        where: { status: "DRAFT" },
      }),
      prisma.newsletterCampaign.count({
        where: { status: "SCHEDULED" },
      }),
      prisma.newsletterCampaign.count({
        where: { status: "SENT" },
      }),
    ]);

    const result = {
      totalSubscribers,
      activeSubscribers,
      inactiveSubscribers,
      totalCampaigns,
      draftCampaigns,
      scheduledCampaigns,
      sentCampaigns,
    };

    console.log("📊 Analytics result:", result);

    res.json(result);
  } catch (err) {
    console.error("❌ Analytics error:", err);
    res.status(500).json({
      error: "Failed to load analytics",
      details: err.message,
    });
  }
}
/* ===========================
   TEMPLATES
=========================== */

export async function getTemplates(req, res) {}

export async function createTemplate(req, res) {}

export async function updateTemplate(req, res) {}

export async function deleteTemplate(req, res) {}