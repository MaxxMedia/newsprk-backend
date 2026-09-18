import express from 'express';
import {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact
} from '../controllers/contactController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission, requireModule } from '../middleware/permissions.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   POST /api/contact
 * @desc    Submit a contact message (Public)
 * @access  Public
 */
router.post('/', createContact);

// ============================================
// ADMIN ROUTES (Authentication required)
// ============================================

/**
 * @route   GET /api/contact
 * @desc    Get all contact messages (Admin only)
 * @access  Private - Admin only
 */
router.get('/', requireAuth, requireModule("contact"), getAllContacts);

/**
 * @route   GET /api/contact/:id
 * @desc    Get a single contact message by ID (Admin only)
 * @access  Private - Admin only
 */
router.get('/:id', requireAuth, requireModule("contact"), getContactById);

/**
 * @route   PATCH /api/contact/:id/status
 * @desc    Update contact message status (Admin only)
 * @access  Private - Admin only
 */
router.patch('/:id/status', requireAuth, requirePermission("contact.edit"), updateContactStatus);

/**
 * @route   DELETE /api/contact/:id
 * @desc    Delete a contact message (Admin only)
 * @access  Private - Admin only
 */
router.delete('/:id', requireAuth, requirePermission("contact.edit"), deleteContact);

export default router;