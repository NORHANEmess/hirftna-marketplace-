'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

const isNotFound = (error) =>
  error?.code === 'PGRST116' || error?.code === '406';

// ─────────────────────────────────────────────────────────────
// GET MY WISHLIST
// ─────────────────────────────────────────────────────────────
const getWishlist = async (userId, query) => {
  const { page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  const { data: items, error, count } = await supabaseAdmin
    .from('wishlist')
    .select(`
      id, created_at,
      product:products (
        id, name, price, avg_rating,
        is_active, view_count,
        seller:sellers ( id, shop_name ),
        images:product_images (
          id, url, position
        )
      )
    `, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error({
      message: 'Failed to fetch wishlist',
      userId,
      error:   error.message,
    });
    throw new AppError('Failed to fetch wishlist', 500);
  }

  return {
    items:      items || [],
    pagination: { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// ADD TO WISHLIST
// ─────────────────────────────────────────────────────────────
const addToWishlist = async (userId, productId) => {
  // Check product exists and is active
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, name, is_active')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    throw new AppError('Product not found', 404);
  }

  if (!product.is_active) {
    throw new AppError('Cannot add inactive product to wishlist', 400);
  }

  // Check if product is already in wishlist
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  if (existingError && !isNotFound(existingError)) {
    logger.error({
      message:   'Failed to check existing wishlist item',
      userId,
      productId,
      error:     existingError.message,
    });
    throw new AppError('Failed to verify wishlist status', 500);
  }

  if (existing) {
    throw new AppError('Product already in your wishlist', 409);
  }

  // Add to wishlist
  const { data: item, error } = await supabaseAdmin
    .from('wishlist')
    .insert({ user_id: userId, product_id: productId })
    .select('id, created_at, product_id')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError('Product already in your wishlist', 409);
    }
    logger.error({
      message:   'Failed to add to wishlist',
      userId,
      productId,
      error:     error.message,
    });
    throw new AppError('Failed to add to wishlist', 500);
  }

  // Track browsing event
  supabaseAdmin
    .from('browsing_events')
    .insert({ user_id: userId, product_id: productId, event_type: 'wishlist' })
    .then(({ error: e }) => {
      if (e) logger.error({ message: 'Failed to track wishlist event', error: e.message });
    });

  logger.info({ message: 'Added to wishlist', userId, productId });
  return item;
};

// ─────────────────────────────────────────────────────────────
// REMOVE FROM WISHLIST
// ─────────────────────────────────────────────────────────────
const removeFromWishlist = async (userId, productId) => {
  const { data: item, error: findError } = await supabaseAdmin
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  if (findError) {
    if (isNotFound(findError)) {
      throw new AppError('Product not in your wishlist', 404);
    }
    throw new AppError('Failed to find wishlist item', 500);
  }

  const { error } = await supabaseAdmin
    .from('wishlist')
    .delete()
    .eq('id', item.id);

  if (error) {
    logger.error({
      message:   'Failed to remove from wishlist',
      userId,
      productId,
      error:     error.message,
    });
    throw new AppError('Failed to remove from wishlist', 500);
  }

  logger.info({ message: 'Removed from wishlist', userId, productId });
};

// ─────────────────────────────────────────────────────────────
// CHECK IF IN WISHLIST
// ─────────────────────────────────────────────────────────────
const isInWishlist = async (userId, productId) => {
  const { data, error } = await supabaseAdmin
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .single();

  if (error && !isNotFound(error)) {
    logger.error({
      message: 'Failed to check wishlist status',
      userId, productId,
      error:   error.message,
    });
  }

  return !!data;
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
};