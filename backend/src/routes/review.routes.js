'use strict';

const { Router }         = require('express');
const reviewController   = require('../controllers/review.controller');
const { authenticate }   = require('../middlewares/auth.middleware');
const { requireRole }    = require('../middlewares/role.middleware');
const { validate,
        validateId }     = require('../middlewares/validate.middleware');
const {
  createReviewSchema,
  createSellerRatingSchema,
  reviewQuerySchema,
} = require('../validators/review.validator');

const router = Router();

// ── PRODUCT REVIEWS ───────────────────────────────────────────

// GET /api/v1/reviews/product/:product_id
router.get(
  '/product/:product_id',
  validateId('product_id'),
  validate({ query: reviewQuerySchema }),
  reviewController.getProductReviews
);

// POST /api/v1/reviews/product
router.post(
  '/product',
  authenticate,
  requireRole('client'),
  validate({ body: createReviewSchema }),
  reviewController.createReview
);

// DELETE /api/v1/reviews/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('client'),
  validateId(),
  reviewController.deleteReview
);

// ── SELLER RATINGS ────────────────────────────────────────────

// GET /api/v1/reviews/seller/:seller_id
router.get(
  '/seller/:seller_id',
  validateId('seller_id'),
  validate({ query: reviewQuerySchema }),
  reviewController.getSellerRatings
);

// POST /api/v1/reviews/seller
router.post(
  '/seller',
  authenticate,
  requireRole('client'),
  validate({ body: createSellerRatingSchema }),
  reviewController.createSellerRating
);

module.exports = router;