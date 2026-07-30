import prisma from "../prismaClient.js";

// GET /api/posts/:postId/comments
export const getComments = async (req, res) => {
  try {
    const postId = Number(req.params.postId);

    const comments = await prisma.comment.findMany({
      where: {
        postId,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
};

// POST /api/posts/:postId/comments
export const addComment = async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        error: "Comment is required",
      });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId: req.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message,
    });
  }
};