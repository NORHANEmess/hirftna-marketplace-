'use strict';

const { Router }              = require('express');
const notificationController  = require('../controllers/notification.controller');
const { authenticate }        = require('../middlewares/auth.middleware');
const { validateId,
        validatePagination }  = require('../middlewares/validate.middleware');

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// SPECIFIC LITERAL ROUTES (matched first in route order)
// ─────────────────────────────────────────────────────────────

// GET /api/v1/notifications/unread-count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/v1/notifications/mark-all-read
router.patch('/mark-all-read', notificationController.markAllAsRead);

// ─────────────────────────────────────────────────────────────
// PARAMETERIZED ROUTES (matched after literals)
// ─────────────────────────────────────────────────────────────

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', validateId(), notificationController.markAsRead);

// DELETE /api/v1/notifications/:id
router.delete('/:id', validateId(), notificationController.deleteNotification);

// ─────────────────────────────────────────────────────────────
// COLLECTION ROUTES (most general, matched last)
// ─────────────────────────────────────────────────────────────

// GET /api/v1/notifications
router.get('/', validatePagination(), notificationController.getNotifications);

module.exports = router;