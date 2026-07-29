import { prisma } from "../lib/prisma.js"

export async function getApplicationReadiness(req, res) {
    try {
        if (req.user.role !== "candidate") {
            return res.status(403).json({ error: "Not allowed" })
        }

        const candidate = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                fullName: true,
                email: true,
                mobile: true,
                headline: true,
                location: true,
                avatarUrl: true,
                resume: {
                    select: { id: true, fileName: true, fileUrl: true, uploadedAt: true },
                },
            },
        })

        if (!candidate) {
            return res.status(404).json({ error: "Candidate not found" })
        }

        const missingFields = []
        if (!candidate.fullName) missingFields.push("Full name")
        if (!candidate.mobile && !candidate.email) missingFields.push("Contact details")
        if (!candidate.resume) missingFields.push("Resume")

        const isReady = missingFields.length === 0

        res.json({
            candidate,
            resume: candidate.resume,
            isReady,
            missingFields,
            message: isReady
                ? "Profile complete."
                : `Please complete your profile before applying: ${missingFields.join(", ")}.`,
        })
    } catch (err) {
        console.error("Application readiness error:", err)
        res.status(500).json({ error: "Failed to check application readiness" })
    }
}