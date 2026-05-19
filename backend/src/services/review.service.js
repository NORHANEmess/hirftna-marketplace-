'use strict';

const { supabaseAdmin }            = require('../config/supabase');
const { AppError }                 = require('../middlewares/error.middleware');
const logger                       = require('../utils/logger');
const { updateVerificationStatus } = require('./verification.service');

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const isNotFound = (error) => error?.code === 'PGRST116';

// ─────────────────────────────────────────────────────────────
// GET PRODUCT REVIEWS
// Public — paginated list of reviews for a product
// Includes order context so consumers can show which order the review is for
// ─────────────────────────────────────────────────────────────
const getProductReviews = async (productId, query) => {
  const { page = 1, limit = 10 } = query;
  const offset = (page - 1) * limit;

  const { data: reviews, error, count } = await supabaseAdmin
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      order:orders ( id, created_at, notes ),
      client:users!client_id (
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

  // Rating distribution
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
// Client only — one review per product per ORDER
// Business rules:
//   • order must exist and belong to this client
//   • order status must be 'completed'
//   • product must be an item in that order (order_items)
//   • one review per (order_id, product_id, client_id)
// ─────────────────────────────────────────────────────────────
const createReview = async (clientId, { order_id, product_id, rating, comment }) => {
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

  // Verify order: exists, owned by client, completed
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, status, client_id, seller_id')
    .eq('id', order_id)
    .single();

  if (orderError) {
    if (isNotFound(orderError)) throw new AppError('Order not found', 404);
    logger.error({ message: 'Failed to verify order for product review', clientId, product_id, error: orderError.message });
    throw new AppError('Failed to verify order', 500);
  }

  if (order.client_id !== clientId) {
    throw new AppError('You can only review products from your own orders', 403);
  }

  if (order.status !== 'completed') {
    throw new AppError('Order must be completed before reviewing', 400);
  }

  // Verify the product was actually part of this order
  const { data: orderItem, error: itemError } = await supabaseAdmin
    .from('order_items')
    .select('id')
    .eq('order_id', order_id)
    .eq('product_id', product_id)
    .maybeSingle();

  if (itemError) {
    logger.error({ message: 'Failed to verify order item', clientId, order_id, product_id, error: itemError.message });
    throw new AppError('Failed to verify order item', 500);
  }

  if (!orderItem) {
    throw new AppError('This product was not part of this order', 400);
  }

  // Check per-order duplicate: (order_id, product_id, client_id)
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('order_id', order_id)
    .eq('product_id', product_id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (existingError) {
    logger.error({ message: 'Failed to check existing review', clientId, product_id, order_id, error: existingError.message });
    throw new AppError('Failed to verify review status', 500);
  }

  if (existing) {
    throw new AppError('You have already reviewed this product for this order', 409);
  }

  // Insert
  const { data: review, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      order_id,
      product_id,
      client_id: clientId,
      rating,
      comment:   comment || null,
    })
    .select(`
      id, rating, comment, created_at,
      client:users!client_id ( id, full_name, avatar_url )
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('You have already reviewed this product for this order', 409);
    }
    logger.error({ message: 'Failed to create review', clientId, product_id, order_id, error: error.message });
    throw new AppError('Failed to submit review', 500);
  }

  logger.info({
    message:   'Review created',
    reviewId:  review.id,
    clientId,
    productId: product_id,
    orderId:   order_id,
    rating,
  });

  return review;
};

// ─────────────────────────────────────────────────────────────
// GET SELLER RATINGS
// Public — paginated ratings for a seller
// Includes order context so consumers can show which order the rating is for
// ─────────────────────────────────────────────────────────────
const getSellerRatings = async (sellerId, query) => {
  const { page = 1, limit = 10 } = query;
  const offset = (page - 1) * limit;

  const { data: ratings, error, count } = await supabaseAdmin
    .from('ratings')
    .select(`
      id, rating, created_at,
      order:orders ( id, created_at, notes ),
      client:users!client_id (
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
// Client only — one rating per ORDER (not per seller)
// Business rules:
//   • order must exist and belong to this client
//   • order status must be 'completed'
//   • seller_id is derived from the order — not trusted from the request
//   • one rating per (order_id, client_id)
// ─────────────────────────────────────────────────────────────
const createSellerRating = async (clientId, { order_id, rating }) => {
  // Verify order: exists, owned by client, completed
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, status, client_id, seller_id')
    .eq('id', order_id)
    .single();

  if (orderError) {
    if (isNotFound(orderError)) throw new AppError('Order not found', 404);
    logger.error({ message: 'Failed to verify order for seller rating', clientId, order_id, error: orderError.message });
    throw new AppError('Failed to verify order', 500);
  }

  if (order.client_id !== clientId) {
    throw new AppError('You can only rate sellers from your own orders', 403);
  }

  if (order.status !== 'completed') {
    throw new AppError(
      `Order must be completed before rating. Current status: "${order.status}"`,
      400
    );
  }

  const seller_id = order.seller_id;

  // Check per-order duplicate: (order_id, client_id)
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('ratings')
    .select('id')
    .eq('order_id', order_id)
    .eq('client_id', clientId)
    .maybeSingle();

  if (existingError) {
    logger.error({ message: 'Failed to verify rating status', clientId, order_id, error: existingError.message });
    throw new AppError('Failed to verify rating status', 500);
  }

  if (existing) {
    throw new AppError('You have already rated this order', 409);
  }

  // Insert
  const { data: newRating, error } = await supabaseAdmin
    .from('ratings')
    .insert({
      order_id,
      seller_id,
      client_id: clientId,
      rating,
    })
    .select(`
      id, rating, created_at,
      client:users!client_id ( id, full_name, avatar_url )
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('You have already rated this order', 409);
    }
    logger.error({ message: 'Failed to create seller rating', clientId, seller_id, order_id, error: error.message });
    throw new AppError('Failed to submit rating', 500);
  }

  logger.info({
    message:  'Seller rated',
    ratingId: newRating.id,
    clientId,
    sellerId: seller_id,
    orderId:  order_id,
    rating,
  });

  // Fire-and-forget: new rating updates avg_rating which may affect verification
  updateVerificationStatus(seller_id);

  return newRating;
};

// ─────────────────────────────────────────────────────────────
// DELETE REVIEW
// Client only — own reviews only
// ─────────────────────────────────────────────────────────────
const deleteReview = async (clientId, reviewId) => {
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
    logger.error({ message: 'Failed to delete review', reviewId, clientId, error: error.message });
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
