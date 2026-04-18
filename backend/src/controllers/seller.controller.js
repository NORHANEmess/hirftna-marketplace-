'use strict';

const sellerService              = require('../services/seller.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendPaginated } = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// IMPORTANT — Validation Pattern
// Always use req.validated.body/query — NEVER req.body/req.query
// Throws 500 if validation middleware was not applied
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// GET ALL SELLERS
// GET /api/v1/sellers
// Public — browse verified sellers
// ─────────────────────────────────────────────────────────────
const getAllSellers = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }

  const result = await sellerService.getAllSellers(req.validated.query);

  return sendPaginated(
    res,
    result.sellers,
    result.pagination,
    'Sellers fetched successfully'
  );
});

// ─────────────────────────────────────────────────────────────
// GET SELLER BY ID
// GET /api/v1/sellers/:id
// Public — full seller profile
// ─────────────────────────────────────────────────────────────
const getSellerById = asyncHandler(async (req, res) => {
  const seller = await sellerService.getSellerById(req.params.id);

  return sendSuccess(
    res,
    { seller },
    'Seller fetched successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// GET MY SELLER PROFILE
// GET /api/v1/sellers/me
// Seller only — own full profile
// ─────────────────────────────────────────────────────────────
const getMySellerProfile = asyncHandler(async (req, res) => {
  const seller = await sellerService.getMySellerProfile(req.user.id);

  return sendSuccess(
    res,
    { seller },
    'Seller profile fetched successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// CREATE SELLER PROFILE
// POST /api/v1/sellers
// Seller only — one shop per user
// ─────────────────────────────────────────────────────────────
const createSeller = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  // Explicitly extract only allowed fields
  const {
    shop_name,
    description,
    story,
    location,
    category_id,
    avatar_url,
  } = req.validated.body;

  const seller = await sellerService.createSeller(
    req.user.id,
    {
      shop_name,
      description,
      story,
      location,
      category_id,
      avatar_url,
    }
  );

  return sendSuccess(
    res,
    { seller },
    'Seller profile created successfully',
    201
  );
});

// ─────────────────────────────────────────────────────────────
// UPDATE SELLER PROFILE
// PUT /api/v1/sellers/:id
// Seller only — must own the profile
// ─────────────────────────────────────────────────────────────
const updateSeller = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  // Explicitly extract only allowed fields
  const {
    shop_name,
    description,
    story,
    location,
    category_id,
    avatar_url,
  } = req.validated.body;

  // Build updates with only provided fields
  const updates = {};
  if (shop_name   !== undefined) updates.shop_name   = shop_name;
  if (description !== undefined) updates.description = description;
  if (story       !== undefined) updates.story       = story;
  if (location    !== undefined) updates.location    = location;
  if (category_id !== undefined) updates.category_id = category_id;
  if (avatar_url  !== undefined) updates.avatar_url  = avatar_url;

  const seller = await sellerService.updateSeller(
    req.user.id,
    req.params.id,
    updates
  );

  return sendSuccess(
    res,
    { seller },
    'Seller profile updated successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// VERIFY SELLER
// PATCH /api/v1/sellers/:id/verify
// Admin only — enforced by requireRole('admin') in routes
// ─────────────────────────────────────────────────────────────
const verifySeller = asyncHandler(async (req, res) => {
  const seller = await sellerService.verifySeller(req.params.id);

  return sendSuccess(
    res,
    { seller },
    `Seller "${seller.shop_name}" verified successfully`,
    200
  );
});

// ─────────────────────────────────────────────────────────────
// GET SELLER ANALYTICS
// GET /api/v1/sellers/analytics
// Seller only — own shop analytics
// ─────────────────────────────────────────────────────────────
const getSellerAnalytics = asyncHandler(async (req, res) => {
  const analytics = await sellerService.getSellerAnalytics(req.user.id);

  return sendSuccess(
    res,
    { analytics },
    'Analytics fetched successfully',
    200
  );
});

module.exports = {
  getAllSellers,
  getSellerById,
  getMySellerProfile,
  createSeller,
  updateSeller,
  verifySeller,
  getSellerAnalytics,
};