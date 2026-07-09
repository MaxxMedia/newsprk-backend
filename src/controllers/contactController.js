import { prisma } from "../lib/prisma.js";

export const createContact = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, website, message } = req.body;

    if (!fullName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and message are required fields"
      });
    }

    const contact = await prisma.contactMessage.create({
      data: {
        fullName,
        email,
        phoneNumber: phoneNumber || null,
        website: website || null,
        message,
        status: "NEW"
      }
    });

    res.status(201).json({
      success: true,
      message: "Contact message sent successfully",
      data: contact
    });
  } catch (error) {
    console.error("Error creating contact message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send contact message",
      error: error.message
    });
  }
};

export const getAllContacts = async (req, res) => {
  try {
    const contacts = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
      error: error.message
    });
  }
};

export const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await prisma.contactMessage.findUnique({
      where: { id: parseInt(id) }
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact message not found"
      });
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error("Error fetching contact:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact",
      error: error.message
    });
  }
};

export const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = [
  'NEW',
  'IN_PROGRESS',
  'RESOLVED',
  'ARCHIVED'
];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const contact = await prisma.contactMessage.update({
      where: { id: parseInt(id) },
      data: { status }
    });

    res.status(200).json({
      success: true,
      message: "Contact status updated successfully",
      data: contact
    });
  } catch (error) {
    console.error("Error updating contact status:", error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "Contact message not found"
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update contact status",
      error: error.message
    });
  }
};

export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contactMessage.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({
      success: true,
      message: "Contact message deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: "Contact message not found"
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to delete contact",
      error: error.message
    });
  }
};