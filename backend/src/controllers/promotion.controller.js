'use strict';

const promotionService           = require('../services/promotion.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess }            = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// REQUEST PROMOTION
// POST /api/v1/promotions/request
// Seller only
// ─────────────────────────────────────────────────────────────
const requestPromotion = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  if (!req.user.seller_id) {
    throw new AppError('You must create a seller profile before requesting a promotion', 400);
  }

  const { placement, requested_days, product_id } = req.validated.body;
  const promotion = await promotionService.requestPromotion(req.user.seller_id, {
    placement,
    requested_days,
    product_id: product_id ?? null,
  });

  return sendSuccess(res, { promotion }, 'Promotion request submitted', 201);
});

// ─────────────────────────────────────────────────────────────
// GET MY PROMOTION
// GET /api/v1/promotions/me
// Seller only
// ─────────────────────────────────────────────────────────────
const getMyPromotion = asyncHandler(async (req, res) => {
  const promotion = await promotionService.getMyPromotion(req.user.seller_id);

  return sendSuccess(res, { promotion }, 'Promotion status fetched', 200);
});

// ─────────────────────────────────────────────────────────────
// GET HERO ADS
// GET /api/v1/promotions/hero
// Public — no auth
// ─────────────────────────────────────────────────────────────
const getHeroAds = asyncHandler(async (req, res) => {
  const ads = await promotionService.getHeroAds();

  return sendSuccess(res, { ads }, 'Hero ads fetched', 200);
});

// ─────────────────────────────────────────────────────────────
// GET BROWSE ADS
// GET /api/v1/promotions/browse
// Public — no auth
// ─────────────────────────────────────────────────────────────
const getBrowseAds = asyncHandler(async (req, res) => {
  const ads = await promotionService.getBrowseAds();

  return sendSuccess(res, { ads }, 'Browse ads fetched', 200);
});

// ─────────────────────────────────────────────────────────────
// GET FEATURED PRODUCTS
// GET /api/v1/promotions/featured-products
// Public — optional ?category_id= query param
// ─────────────────────────────────────────────────────────────
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const categoryId = req.query.category_id || null;
  const products = await promotionService.getFeaturedProducts(categoryId);

  return sendSuccess(res, { products }, 'Featured products fetched', 200);
});

// ─────────────────────────────────────────────────────────────
// GET MY PRODUCT PROMOTIONS
// GET /api/v1/promotions/my-product-promotions
// Seller only
// ─────────────────────────────────────────────────────────────
const getMyProductPromotions = asyncHandler(async (req, res) => {
  const promotions = await promotionService.getMyProductPromotions(req.user.seller_id);

  return sendSuccess(res, { promotions }, 'Product promotions fetched', 200);
});

module.exports = {
  requestPromotion,
  getMyPromotion,
  getMyProductPromotions,
  getHeroAds,
  getBrowseAds,
  getFeaturedProducts,
};
