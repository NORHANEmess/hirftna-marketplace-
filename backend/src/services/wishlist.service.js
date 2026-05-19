'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');
const productService = require('./product.service');

const getWishlist = async (userId, query) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
  const offset = (page - 1) * limit;

  const { data: wishlistRows, error, count } = await supabaseAdmin
    .from('wishlist')
    .select('id, product_id, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error({
      message: 'Failed to fetch wishlist',
      userId,
      error: error.message,
      code: error.code,
    });
    throw new AppError('Failed to fetch wishlist', 500);
  }

  const products = await productService.getProductsByIds(
    (wishlistRows || []).map((row) => row.product_id),
    { includeInactive: true }
  );
  const productsById = new Map(products.map((product) => [product.id, product]));

  return {
    items: (wishlistRows || []).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      product_id: row.product_id,
      product: productsById.get(row.product_id) || null,
    })),
    pagination: { page, limit, total: count || 0 },
  };
};

const addToWishlist = async (userId, productId) => {
  const { data: product, error: productError } = await supabaseAdmin
    .from('products')
    .select('id, name, is_active')
    .eq('id', productId)
    .maybeSingle();

  if (productError) {
    logger.error({
      message: 'Failed to verify product for wishlist',
      userId,
      productId,
      error: productError.message,
      code: productError.code,
    });
    throw new AppError('Failed to verify product', 500);
  }

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (!product.is_active) {
    throw new AppError('Cannot add inactive product to wishlist', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingError) {
    logger.error({
      message: 'Failed to check existing wishlist item',
      userId,
      productId,
      error: existingError.message,
      code: existingError.code,
    });
    throw new AppError('Failed to verify wishlist status', 500);
  }

  if (existing) {
    throw new AppError('Product already in your wishlist', 409);
  }

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
      message: 'Failed to add to wishlist',
      userId,
      productId,
      error: error.message,
      code: error.code,
    });
    throw new AppError('Failed to add to wishlist', 500);
  }

  void supabaseAdmin
    .from('browsing_events')
    .insert({ user_id: userId, product_id: productId, event_type: 'wishlist' })
    .then(({ error: eventError }) => {
      if (eventError) {
        logger.error({
          message: 'Failed to track wishlist event',
          userId,
          productId,
          error: eventError.message,
        });
      }
    })
    .catch((err) => {
      logger.error({ message: 'Unexpected error tracking wishlist event', userId, productId, error: err.message });
    });

  logger.info({ message: 'Added to wishlist', userId, productId });
  return item;
};

const removeFromWishlist = async (userId, productId) => {
  const { data: item, error: findError } = await supabaseAdmin
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (findError) {
    logger.error({
      message: 'Failed to find wishlist item',
      userId,
      productId,
      error: findError.message,
      code: findError.code,
    });
    throw new AppError('Failed to find wishlist item', 500);
  }

  if (!item) {
    throw new AppError('Product not in your wishlist', 404);
  }

  const { error } = await supabaseAdmin
    .from('wishlist')
    .delete()
    .eq('id', item.id);

  if (error) {
    logger.error({
      message: 'Failed to remove from wishlist',
      userId,
      productId,
      error: error.message,
      code: error.code,
    });
    throw new AppError('Failed to remove from wishlist', 500);
  }

  logger.info({ message: 'Removed from wishlist', userId, productId });
};

const isInWishlist = async (userId, productId) => {
  const { data, error } = await supabaseAdmin
    .from('wishlist')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    logger.error({
      message: 'Failed to check wishlist status',
      userId,
      productId,
      error: error.message,
      code: error.code,
    });
    return false;
  }

  return !!data;
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
};
