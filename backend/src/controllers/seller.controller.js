'use strict';

const sellerService              = require('../services/seller.service');
const verificationService        = require('../services/verification.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendCollection } = require('../utils/response');

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

  return sendCollection(
    res,
    result.sellers,
    result.pagination,
    'Sellers fetched successfully',
    ['sellers']
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
    {
      seller,
      products: Array.isArray(seller?.products) ? seller.products : [],
    },
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
    {
      seller,
      products: Array.isArray(seller?.products) ? seller.products : [],
    },
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

  const {
    shop_name,
    description,
    bio,
    story,
    location,
    city,
    category_id,
    avatar_url,
  } = req.validated.body;

  const seller = await sellerService.createSeller(req.user.id, {
    shop_name,
    description,
    bio,
    story,
    location,
    city,
    category_id,
    avatar_url,
  });

  return sendSuccess(res, { seller }, 'Seller profile created successfully', 201);
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

  const {
    shop_name,
    description,
    bio,
    story,
    location,
    city,
    category_id,
    avatar_url,
  } = req.validated.body;

  const updates = {};
  if (shop_name   !== undefined) updates.shop_name   = shop_name;
  if (description !== undefined) updates.description = description;
  if (bio         !== undefined) updates.bio         = bio;
  if (story       !== undefined) updates.story       = story;
  if (location    !== undefined) updates.location    = location;
  if (city        !== undefined) updates.city        = city;
  if (category_id !== undefined) updates.category_id = category_id;
  if (avatar_url  !== undefined) updates.avatar_url  = avatar_url;

  // Guard: nothing to update after mapping
  if (Object.keys(updates).length === 0) {
    throw new AppError('At least one field must be provided to update', 400);
  }

  const seller = await sellerService.updateSeller(
    req.user.id,
    req.params.id,
    updates
  );

  return sendSuccess(res, { seller }, 'Seller profile updated successfully', 200);
});

// ─────────────────────────────────────────────────────────────
// VERIFY SELLER
// PATCH /api/v1/sellers/:id/verify
// Admin only
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

  return sendSuccess(res, { analytics }, 'Analytics fetched successfully', 200);
});

// ─────────────────────────────────────────────────────────────
// GET MY VERIFICATION STATUS
// GET /api/v1/sellers/me/verification-status
// Seller only — returns criteria progress for dashboard UI
// ─────────────────────────────────────────────────────────────
const getMyVerificationStatus = asyncHandler(async (req, res) => {
  const seller = await sellerService.getMySellerProfile(req.user.id);
  const status = await verificationService.getVerificationStatus(seller.id);

  return sendSuccess(res, status, 'Verification status fetched successfully', 200);
});

module.exports = {
  getAllSellers,
  getSellerById,
  getMySellerProfile,
  createSeller,
  updateSeller,
  verifySeller,
  getSellerAnalytics,
  getMyVerificationStatus,
};
