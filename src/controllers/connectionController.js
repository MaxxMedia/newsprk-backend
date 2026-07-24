import * as connectionService from "../services/connectionService.js";

export const sendConnectionRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId, message } = req.body;

    const result = await connectionService.sendConnectionRequest({
      senderId,
      receiverId,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Connection request sent successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { requestId } = req.params;

    const result = await connectionService.acceptConnectionRequest({
      requestId: Number(requestId),
      receiverId,
    });

    return res.status(200).json({
      success: true,
      message: "Connection request accepted successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const rejectConnectionRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { requestId } = req.params;

    const result = await connectionService.rejectConnectionRequest({
      requestId: Number(requestId),
      receiverId,
    });

    return res.status(200).json({
      success: true,
      message: "Connection request rejected successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const cancelConnectionRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { requestId } = req.params;

    const result = await connectionService.cancelConnectionRequest({
      requestId: Number(requestId),
      senderId,
    });

    return res.status(200).json({
      success: true,
      message: "Connection request cancelled successfully.",
      data: result,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const connections = await connectionService.getMyConnections(userId);

    return res.status(200).json({
      success: true,
      data: connections,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = Number(req.params.userId);

    await connectionService.removeConnection({
      userId,
      connectionId,
    });

    return res.status(200).json({
      success: true,
      message: "Connection removed successfully.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getReceivedRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await connectionService.getReceivedRequests(userId);

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await connectionService.getSentRequests(userId);

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getConnectionStatus = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = Number(req.params.userId);

    const status = await connectionService.getConnectionStatus({
      currentUserId,
      targetUserId,
    });

    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMutualConnections = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = Number(req.params.userId);

    const mutualConnections =
      await connectionService.getMutualConnections({
        currentUserId,
        targetUserId,
      });

    return res.status(200).json({
      success: true,
      count: mutualConnections.length,
      data: mutualConnections,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export const getSuggestedConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const suggestions =
      await connectionService.getSuggestedConnections(userId);

    return res.status(200).json({
      success: true,
      count: suggestions.length,
      data: suggestions,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};