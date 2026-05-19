'use strict';

const { Router }           = require('express');
const { z }                = require('zod');
const promotionController  = require('../controllers/promotion.controller');
const { authenticate }     = require('../middlewares/auth.middleware');
const { requireRole }      = require('../middlewares/role.middleware');
const { validate }         = require('../middlewares/validate.middleware');
const {
  requestPromotionSchema,
} = require('../validators/promotion.validator');

const featuredProductsQuerySchema = z.object({
  category_id: z.string().uuid({ message: 'category_id must be a valid UUID' }).optional(),
  limit: z.string().optional().transform((val) => {
    const parsed = parseInt(val ?? '20', 10);
    return isNaN(parsed) ? 20 : parsed;
  }).pipe(z.number().int().min(1).max(50)),
});

const router = Router();

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES — no auth
// ─────────────────────────────────────────────────────────────

// GET /api/v1/promotions/hero
router.get('/hero', promotionController.getHeroAds);

// GET /api/v1/promotions/browse
router.get('/browse', promotionController.getBrowseAds);

// GET /api/v1/promotions/featured-products  (optional ?category_id=)
router.get('/featured-products',
  validate({ query: featuredProductsQuerySchema }),
  promotionController.getFeaturedProducts
);

// ─────────────────────────────────────────────────────────────
// SELLER ROUTES
// ─────────────────────────────────────────────────────────────

// POST /api/v1/promotions/request
router.post(
  '/request',
  authenticate,
  requireRole('seller'),
  validate({ body: requestPromotionSchema }),
  promotionController.requestPromotion
);

// GET /api/v1/promotions/me
router.get(
  '/me',
  authenticate,
  requireRole('seller'),
  promotionController.getMyPromotion
);

// GET /api/v1/promotions/my-product-promotions
router.get(
  '/my-product-promotions',
  authenticate,
  requireRole('seller'),
  promotionController.getMyProductPromotions
);

module.exports = router;
