'use strict';

const { Router }               = require('express');
const sellerController         = require('../controllers/seller.controller');
const { authenticate }         = require('../middlewares/auth.middleware');
const { requireRole }          = require('../middlewares/role.middleware');
const { validate,
        validateId,
        validatePagination }   = require('../middlewares/validate.middleware');
const {
  createSellerSchema,
  updateSellerSchema,
  sellerQuerySchema,
} = require('../validators/seller.validator');

const router = Router();

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// No authentication required
// ─────────────────────────────────────────────────────────────

// GET /api/v1/sellers
// Browse all verified sellers with filters and pagination
router.get(
  '/',
  validate({ query: sellerQuerySchema }),
  sellerController.getAllSellers
);

// ─────────────────────────────────────────────────────────────
// SELLER ONLY ROUTES
// Must be BEFORE /:id to avoid conflicts
// ─────────────────────────────────────────────────────────────

// GET /api/v1/sellers/me
// Own seller profile
router.get(
  '/me',
  authenticate,
  requireRole('seller'),
  sellerController.getMySellerProfile
);

// GET /api/v1/sellers/me/verification-status
// Criteria progress for the logged-in seller's dashboard
router.get(
  '/me/verification-status',
  authenticate,
  requireRole('seller'),
  sellerController.getMyVerificationStatus
);

// GET /api/v1/sellers/analytics
// Own shop analytics and metrics
router.get(
  '/analytics',
  authenticate,
  requireRole('seller'),
  sellerController.getSellerAnalytics
);

// POST /api/v1/sellers
// Create a new shop (one per user)
router.post(
  '/',
  authenticate,
  requireRole('seller'),
  validate({ body: createSellerSchema }),
  sellerController.createSeller
);

// PUT /api/v1/sellers/:id
// Update shop profile (owner only — checked in service)
router.put(
  '/:id',
  authenticate,
  requireRole('seller'),
  validateId(),
  validate({ body: updateSellerSchema }),
  sellerController.updateSeller
);

// ─────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

// PATCH /api/v1/sellers/:id/verify
// Verify seller (admin only)
router.patch(
  '/:id/verify',
  authenticate,
  requireRole('admin'),
  validateId(),
  sellerController.verifySeller
);

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES WITH PARAMS
// Must be LAST to avoid conflicts with /me, /analytics, etc.
// ─────────────────────────────────────────────────────────────

// GET /api/v1/sellers/:id
// View seller profile and products
router.get(
  '/:id',
  validateId(),
  sellerController.getSellerById
);

module.exports = router;
