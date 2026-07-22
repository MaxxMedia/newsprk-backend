import { prisma } from "../lib/prisma.js"

/* 🌍 Public candidate profile */
export async function getCandidateProfile(req, res) {
  try {
    const { username } = req.params

    const candidate = await prisma.user.findUnique({
      where: { username },
      include: {
        skills: {
          orderBy: {
            createdAt: "asc",
          },
        },
        experiences: {
          include: {
            company: true,
          },
          orderBy: {
            startDate: "desc",
          },
        },
        education: true,
        projects: true,
        certifications: true,
        languages: true,
        socials: true,
        interests: true,
        achievements: true,
      },
    })

    if (!candidate || candidate.role !== "candidate") {
      return res.status(404).json({ error: "Candidate not found" })
    }

    res.json(candidate)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch candidate profile" })
  }
}

/* 🔐 Logged-in candidate profile */
export async function getMyCandidateProfile(req, res) {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        skills: {
          orderBy: {
            createdAt: "asc",
          },
        },
        experiences: {
          include: {
            company: true,
          },
          orderBy: {
            startDate: "desc",
          },
        },
        education: true,
        projects: true,
        certifications: true,
        languages: true,
        socials: true,
        interests: true,
        achievements: true,
      },
    })

    res.json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch my profile" })
  }
}

/* 🆕 First-time onboarding */
export async function onboardCandidate(req, res) {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({ error: "Not allowed" })
    }

    if (req.user.isOnboarded) {
      return res.status(400).json({ error: "Candidate already onboarded" })
    }

    const { fullName, headline, location, about } = req.body

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName,
        headline,
        location,
        about,
        isOnboarded: true,
      },
    })

    res.json(user)
  } catch (err) {
    console.error("Candidate onboarding error:", err)
    res.status(500).json({ error: "Failed to onboard candidate" })
  }
}

/* ✏️ Edit profile */
export async function updateCandidateProfile(req, res) {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({ error: "Not allowed" })
    }

    const {
      fullName,
      headline,
      location,
      about,
      avatarUrl,
      websiteUrl,
    } = req.body

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName,
        headline,
        location,
        about,
        avatarUrl,
        websiteUrl,
      },
    })

    res.json(updatedUser)
  } catch (err) {
    console.error("Update profile error:", err)
    res.status(500).json({ error: "Failed to update profile" })
  }
}