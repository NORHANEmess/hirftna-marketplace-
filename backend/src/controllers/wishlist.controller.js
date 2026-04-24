'use strict';

const wishlistService            = require('../services/wishlist.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendPaginated } = require('../utils/response');

const getWishlist = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }
  const result = await wishlistService.getWishlist(
    req.user.id,
    req.validated.query
  );
  return sendPaginated(
    res,
    result.items,
    result.pagination,
    'Wishlist fetched successfully'
  );
});

const addToWishlist = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }
  const { product_id } = req.validated.body;
  const item = await wishlistService.addToWishlist(req.user.id, product_id);
  return sendSuccess(res, { item }, 'Added to wishlist', 201);
});

const removeFromWishlist = asyncHandler(async (req, res) => {
  await wishlistService.removeFromWishlist(
    req.user.id,
    req.validated.params.product_id
  );
  return sendSuccess(res, null, 'Removed from wishlist', 200);
});

const checkWishlist = asyncHandler(async (req, res) => {
  const inWishlist = await wishlistService.isInWishlist(
    req.user.id,
    req.validated.params.product_id
  );
  return sendSuccess(
    res,
    { inWishlist, in_wishlist: inWishlist },
    'Wishlist status checked',
    200
  );
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
};
