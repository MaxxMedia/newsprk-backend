import prisma from "../prismaClient.js";

export const sendConnectionRequest = async ({
  senderId,
  receiverId,
  message,
}) => {
  // Cannot send request to yourself
  if (senderId === receiverId) {
    throw new Error("You cannot send a connection request to yourself.");
  }

  // Receiver exists?
  const receiver = await prisma.user.findUnique({
    where: {
      id: receiverId,
    },
  });

  if (!receiver) {
    throw new Error("User not found.");
  }

  // Already connected?
  const existingConnection = await prisma.userConnection.findFirst({
    where: {
      userId: senderId,
      connectionId: receiverId,
    },
  });

  if (existingConnection) {
    throw new Error("You are already connected.");
  }

  // Pending request either direction
  const pendingRequest = await prisma.connectionRequest.findFirst({
    where: {
      OR: [
        {
          senderId,
          receiverId,
          status: "PENDING",
        },
        {
          senderId: receiverId,
          receiverId: senderId,
          status: "PENDING",
        },
      ],
    },
  });

  if (pendingRequest) {
    throw new Error("A pending connection request already exists.");
  }

  // Create request
  const request = await prisma.connectionRequest.create({
    data: {
      senderId,
      receiverId,
      message,
    },
  });

  return request;
};

export const acceptConnectionRequest = async ({
  requestId,
  receiverId,
}) => {
  const request = await prisma.connectionRequest.findUnique({
    where: {
      id: requestId,
    },
  });

  if (!request) {
    throw new Error("Connection request not found.");
  }

  if (request.receiverId !== receiverId) {
    throw new Error("Unauthorized.");
  }

  if (request.status !== "PENDING") {
    throw new Error("This request has already been processed.");
  }

  return await prisma.$transaction(async (tx) => {
    // Update request
    const updatedRequest = await tx.connectionRequest.update({
      where: {
        id: requestId,
      },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        respondedAt: new Date(),
      },
    });

    // Create sender -> receiver
    await tx.userConnection.create({
      data: {
        userId: request.senderId,
        connectionId: request.receiverId,
      },
    });

    // Create receiver -> sender
    await tx.userConnection.create({
      data: {
        userId: request.receiverId,
        connectionId: request.senderId,
      },
    });

    return updatedRequest;
  });
};


export const rejectConnectionRequest = async ({
  requestId,
  receiverId,
}) => {
  const request = await prisma.connectionRequest.findUnique({
    where: {
      id: requestId,
    },
  });

  if (!request) {
    throw new Error("Connection request not found.");
  }

  if (request.receiverId !== receiverId) {
    throw new Error("Unauthorized.");
  }

  if (request.status !== "PENDING") {
    throw new Error("This request has already been processed.");
  }

  const updatedRequest = await prisma.connectionRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status: "REJECTED",
      respondedAt: new Date(),
    },
  });

  return updatedRequest;
};

export const cancelConnectionRequest = async ({
  requestId,
  senderId,
}) => {
  const request = await prisma.connectionRequest.findUnique({
    where: {
      id: requestId,
    },
  });

  if (!request) {
    throw new Error("Connection request not found.");
  }

  if (request.senderId !== senderId) {
    throw new Error("Unauthorized.");
  }

  if (request.status !== "PENDING") {
    throw new Error("Only pending requests can be cancelled.");
  }

  const updatedRequest = await prisma.connectionRequest.update({
    where: {
      id: requestId,
    },
    data: {
      status: "CANCELLED",
      respondedAt: new Date(),
    },
  });

  return updatedRequest;
};

export const getMyConnections = async (userId) => {
  const connections = await prisma.userConnection.findMany({
    where: {
      userId,
    },
    include: {
      connection: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          headline: true,
          location: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return connections.map((item) => item.connection);
};

export const removeConnection = async ({
  userId,
  connectionId,
}) => {
  if (userId === connectionId) {
    throw new Error("Invalid connection.");
  }

  const connection = await prisma.userConnection.findFirst({
    where: {
      userId,
      connectionId,
    },
  });

  if (!connection) {
    throw new Error("Connection not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.userConnection.deleteMany({
      where: {
        OR: [
          {
            userId,
            connectionId,
          },
          {
            userId: connectionId,
            connectionId: userId,
          },
        ],
      },
    });
  });

  return true;
};

export const getReceivedRequests = async (userId) => {
  return await prisma.connectionRequest.findMany({
    where: {
      receiverId: userId,
      status: "PENDING",
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          headline: true,
          location: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getSentRequests = async (userId) => {
  return await prisma.connectionRequest.findMany({
    where: {
      senderId: userId,
      status: "PENDING",
    },
    include: {
      receiver: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          headline: true,
          location: true,
          username: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getConnectionStatus = async ({
  currentUserId,
  targetUserId,
}) => {
  if (currentUserId === targetUserId) {
    return {
      status: "SELF",
    };
  }

  // Already connected
  const connection = await prisma.userConnection.findFirst({
    where: {
      userId: currentUserId,
      connectionId: targetUserId,
    },
  });

  if (connection) {
    return {
      status: "CONNECTED",
    };
  }

  // Current user sent request
  const sentRequest = await prisma.connectionRequest.findFirst({
    where: {
      senderId: currentUserId,
      receiverId: targetUserId,
      status: "PENDING",
    },
  });

  if (sentRequest) {
    return {
      status: "PENDING_SENT",
      requestId: sentRequest.id,
    };
  }

  // Current user received request
  const receivedRequest = await prisma.connectionRequest.findFirst({
    where: {
      senderId: targetUserId,
      receiverId: currentUserId,
      status: "PENDING",
    },
  });

  if (receivedRequest) {
    return {
      status: "PENDING_RECEIVED",
      requestId: receivedRequest.id,
    };
  }

  return {
    status: "NOT_CONNECTED",
  };
};

export const getMutualConnections = async ({
  currentUserId,
  targetUserId,
}) => {
  const myConnections = await prisma.userConnection.findMany({
    where: {
      userId: currentUserId,
    },
    select: {
      connectionId: true,
    },
  });

  const targetConnections = await prisma.userConnection.findMany({
    where: {
      userId: targetUserId,
    },
    include: {
      connection: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          headline: true,
          location: true,
        },
      },
    },
  });

  const myConnectionIds = new Set(
    myConnections.map((c) => c.connectionId)
  );

  return targetConnections
    .filter((c) => myConnectionIds.has(c.connectionId))
    .map((c) => c.connection);
};

export const getSuggestedConnections = async (userId) => {
  // Existing connections
  const connections = await prisma.userConnection.findMany({
    where: {
      userId,
    },
    select: {
      connectionId: true,
    },
  });

  const connectedIds = connections.map((c) => c.connectionId);

  // Pending requests
  const pendingRequests = await prisma.connectionRequest.findMany({
    where: {
      OR: [
        {
          senderId: userId,
          status: "PENDING",
        },
        {
          receiverId: userId,
          status: "PENDING",
        },
      ],
    },
    select: {
      senderId: true,
      receiverId: true,
    },
  });

  const excludedIds = new Set([
    userId,
    ...connectedIds,
    ...pendingRequests.flatMap((r) => [r.senderId, r.receiverId]),
  ]);

  const suggestions = await prisma.user.findMany({
    where: {
      id: {
        notIn: [...excludedIds],
      },
    },
    select: {
      id: true,
      fullName: true,
      profileImage: true,
      headline: true,
      location: true,
      username: true,
    },
    take: 20,
  });

  return suggestions;
};