import express from 'express';
import {
  createContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact
} from '../controllers/contactController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

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
router.get('/', requireAuth, requireAdmin, getAllContacts);

/**
 * @route   GET /api/contact/:id
 * @desc    Get a single contact message by ID (Admin only)
 * @access  Private - Admin only
 */
router.get('/:id', requireAuth, requireAdmin, getContactById);

/**
 * @route   PATCH /api/contact/:id/status
 * @desc    Update contact message status (Admin only)
 * @access  Private - Admin only
 */
router.patch('/:id/status', requireAuth, requireAdmin, updateContactStatus);

/**
 * @route   DELETE /api/contact/:id
 * @desc    Delete a contact message (Admin only)
 * @access  Private - Admin only
 */
router.delete('/:id', requireAuth, requireAdmin, deleteContact);

export default router;