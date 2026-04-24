'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const isNotFound = (error) =>
  error?.code === 'PGRST116' || error?.code === '406';

// ─────────────────────────────────────────────────────────────
// GET PRODUCT REVIEWS
// Public — paginated list of reviews for a product
// ─────────────────────────────────────────────────────────────
const getProductReviews = async (productId, query) => {
  const { page = 1, limit = 10 } = query;
  const offset = (page - 1) * limit;

  const { data: reviews, error, count } = await supabaseAdmin
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      client:users (
        id, full_name, avatar_url
      )
    `, { count: 'exact' })
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error({
      message:   'Failed to fetch product reviews',
      productId,
      error:     error.message,
    });
    throw new AppError('Failed to fetch reviews', 500);
  }

  // Get rating distribution
  const { data: distribution } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('product_id', productId);

  const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (distribution) {
    distribution.forEach((r) => {
      ratingDist[r.rating] = (ratingDist[r.rating] || 0) + 1;
    });
  }

  return {
    reviews:      reviews || [],
    distribution: ratingDist,
    pagination:   { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// CREATE PRODUCT REVIEW
// Client only — one review per product per client
// ─────────────────────────────────────────────────────────────
const createReview = async (clientId, { product_id, rating, comment }) => {
  // Check product exists and is active
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, name, seller_id, is_active')
    .eq('id', product_id)
    .single();

  if (productError || !product) {
    throw new AppError('Product not found', 404);
  }

  if (!product.is_active) {
    throw new AppError('Cannot review an inactive product', 400);
  }

  // Check client hasn't already reviewed this product
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('product_id', product_id)
    .eq('client_id', clientId)
    .single();

  if (existingError && !isNotFound(existingError)) {
    logger.error({
      message: 'Failed to check existing review',
      clientId, product_id,
      error:   existingError.message,
    });
    throw new AppError('Failed to verify review status', 500);
  }

  if (existing) {
    throw new AppError(
      'You have already reviewed this product',
      409
    );
  }

  // Create review
  const { data: review, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      product_id,
      client_id: clientId,
      rating,
      comment:   comment || null,
    })
    .select(`
      id, rating, comment, created_at,
      client:users ( id, full_name, avatar_url )
    `)
    .single();

  if (error) {
    // Handle unique constraint (duplicate review)
    if (error.code === '23505') {
      throw new AppError('You have already reviewed this product', 409);
    }
    logger.error({
      message: 'Failed to create review',
      clientId, product_id,
      error:   error.message,
    });
    throw new AppError('Failed to submit review', 500);
  }

  logger.info({
    message:   'Review created',
    reviewId:  review.id,
    clientId,
    productId: product_id,
    rating,
  });

  return review;
};

// ─────────────────────────────────────────────────────────────
// GET SELLER RATINGS
// Public — paginated ratings for a seller
// ─────────────────────────────────────────────────────────────
const getSellerRatings = async (sellerId, query) => {
  const { page = 1, limit = 10 } = query;
  const offset = (page - 1) * limit;

  const { data: ratings, error, count } = await supabaseAdmin
    .from('ratings')
    .select(`
      id, rating, created_at,
      client:users (
        id, full_name, avatar_url
      )
    `, { count: 'exact' })
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error({
      message:  'Failed to fetch seller ratings',
      sellerId,
      error:    error.message,
    });
    throw new AppError('Failed to fetch ratings', 500);
  }

  return {
    ratings:    ratings || [],
    pagination: { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// CREATE SELLER RATING
// Client only — one rating per seller per client
// ─────────────────────────────────────────────────────────────
const createSellerRating = async (clientId, { seller_id, rating }) => {
  // Check seller exists
  const { data: seller, error: sellerError } = await supabaseAdmin
    .from('sellers')
    .select('id, is_verified')
    .eq('id', seller_id)
    .single();

  if (sellerError || !seller) {
    throw new AppError('Seller not found', 404);
  }

  // Check client hasn't already rated this seller
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('ratings')
    .select('id')
    .eq('seller_id', seller_id)
    .eq('client_id', clientId)
    .single();

  if (existingError && !isNotFound(existingError)) {
    throw new AppError('Failed to verify rating status', 500);
  }

  if (existing) {
    throw new AppError('You have already rated this seller', 409);
  }

  // Create rating
  const { data: newRating, error } = await supabaseAdmin
    .from('ratings')
    .insert({
      seller_id,
      client_id: clientId,
      rating,
    })
    .select(`
      id, rating, created_at,
      client:users ( id, full_name, avatar_url )
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('You have already rated this seller', 409);
    }
    logger.error({
      message: 'Failed to create seller rating',
      clientId, seller_id,
      error:   error.message,
    });
    throw new AppError('Failed to submit rating', 500);
  }

  logger.info({
    message:  'Seller rated',
    ratingId: newRating.id,
    clientId,
    sellerId: seller_id,
    rating,
  });

  return newRating;
};

// ─────────────────────────────────────────────────────────────
// DELETE REVIEW
// Client only — own reviews only
// ─────────────────────────────────────────────────────────────
const deleteReview = async (clientId, reviewId) => {
  // Find review and verify ownership
  const { data: review, error: findError } = await supabaseAdmin
    .from('reviews')
    .select('id, client_id, product_id')
    .eq('id', reviewId)
    .single();

  if (findError) {
    if (isNotFound(findError)) throw new AppError('Review not found', 404);
    throw new AppError('Failed to find review', 500);
  }

  if (review.client_id !== clientId) {
    throw new AppError('You can only delete your own reviews', 403);
  }

  const { error } = await supabaseAdmin
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) {
    logger.error({
      message:  'Failed to delete review',
      reviewId,
      clientId,
      error:    error.message,
    });
    throw new AppError('Failed to delete review', 500);
  }

  logger.info({ message: 'Review deleted', reviewId, clientId });
};

module.exports = {
  getProductReviews,
  createReview,
  getSellerRatings,
  createSellerRating,
  deleteReview,
};