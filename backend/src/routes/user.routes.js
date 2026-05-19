'use strict';

const { Router }        = require('express');
const userController    = require('../controllers/user.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { validateId }    = require('../middlewares/validate.middleware');

const router = Router();

// ─────────────────────────────────────────────────────────────
// GET /api/v1/users/:id/public
// Any authenticated user (client or seller) can view a client's
// public trust profile before deciding to accept an order.
// Returns: full_name, avatar_url, created_at, completed orders count.
// Does NOT expose: email, phone, password, or any private data.
// ─────────────────────────────────────────────────────────────
router.get(
  '/:id/public',
  authenticate,
  validateId('id'),
  userController.getPublicProfile
);

module.exports = router;
