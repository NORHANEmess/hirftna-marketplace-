'use strict';

const reviewService              = require('../services/review.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendPaginated } = require('../utils/response');

const getProductReviews = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }
  const { product_id } = req.params;
  const result = await reviewService.getProductReviews(
    product_id,
    req.validated.query
  );
  return sendSuccess(res, {
    reviews:      result.reviews,
    distribution: result.distribution,
    pagination:   result.pagination,
  }, 'Reviews fetched successfully', 200);
});

const createReview = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }
  const { product_id, rating, comment } = req.validated.body;
  const review = await reviewService.createReview(
    req.user.id,
    { product_id, rating, comment }
  );
  return sendSuccess(res, { review }, 'Review submitted successfully', 201);
});

const getSellerRatings = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }
  const { seller_id } = req.params;
  const result = await reviewService.getSellerRatings(
    seller_id,
    req.validated.query
  );
  return sendPaginated(
    res,
    result.ratings,
    result.pagination,
    'Ratings fetched successfully'
  );
});

const createSellerRating = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }
  const { seller_id, rating } = req.validated.body;
  const newRating = await reviewService.createSellerRating(
    req.user.id,
    { seller_id, rating }
  );
  return sendSuccess(res, { rating: newRating }, 'Rating submitted successfully', 201);
});

const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(req.user.id, req.validated.params.id);
  return sendSuccess(res, null, 'Review deleted successfully', 200);
});

module.exports = {
  getProductReviews,
  createReview,
  getSellerRatings,
  createSellerRating,
  deleteReview,
};