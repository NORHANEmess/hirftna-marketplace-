'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

const isNotFound = (error) => error?.code === 'PGRST116';

// ─────────────────────────────────────────────────────────────
// REQUEST PROMOTION
// Seller submits a promotion request — only one active/pending at a time
// ─────────────────────────────────────────────────────────────
const requestPromotion = async (sellerId, { placement = 'hero', requested_days = 7, product_id = null }) => {
  // If product_id is provided, verify it exists and belongs to this seller
  if (product_id) {
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, seller_id')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      throw new AppError('Product not found', 404);
    }

    if (product.seller_id !== sellerId) {
      throw new AppError('You can only promote your own products', 403);
    }
  }

  const isProductLevel = placement === 'featured' || placement === 'category_top';

  // For product-level: one pending/active per product. For seller-level: one pending/active per seller.
  let conflictQuery = supabaseAdmin
    .from('promotions')
    .select('id, status')
    .eq('seller_id', sellerId)
    .in('status', ['pending', 'active'])
    .limit(1);

  if (isProductLevel) {
    conflictQuery = conflictQuery.eq('product_id', product_id);
  } else {
    conflictQuery = conflictQuery.in('placement', ['hero', 'browse']).is('product_id', null);
  }

  const { data: existingRows, error: checkError } = await conflictQuery;

  if (checkError) {
    logger.error({ message: 'Failed to check existing promotions', sellerId, error: checkError.message, code: checkError.code });
    if (checkError.code === '42703') {
      throw new AppError('Database migration not applied — run 003_promotions_extend.sql in Supabase first', 500);
    }
    throw new AppError(
      process.env.NODE_ENV !== 'production'
        ? `DB check error: ${checkError.message}`
        : 'Failed to submit promotion request',
      500
    );
  }

  const existing = existingRows?.[0] ?? null;
  if (existing) {
    throw new AppError(
      existing.status === 'active'
        ? 'You already have an active promotion'
        : 'You already have a pending promotion request',
      409
    );
  }

  const { data: promotion, error } = await supabaseAdmin
    .from('promotions')
    .insert({
      seller_id:      sellerId,
      product_id:     product_id ?? null,
      placement,
      requested_days,
      status:         'pending',
      is_active:      false,
    })
    .select('id, seller_id, placement, requested_days, status, created_at')
    .single();

  if (error) {
    logger.error({ message: 'Failed to create promotion request', sellerId, error: error.message, code: error.code, hint: error.hint, details: error.details });
    throw new AppError(
      process.env.NODE_ENV !== 'production'
        ? `DB insert error: ${error.message}`
        : 'Failed to submit promotion request',
      500
    );
  }

  return promotion;
};

// ─────────────────────────────────────────────────────────────
// GET MY PROMOTION
// Returns the seller's latest promotion request/status
// ─────────────────────────────────────────────────────────────
const getMyPromotion = async (sellerId) => {
  const { data: promotion, error } = await supabaseAdmin
    .from('promotions')
    .select('id, seller_id, placement, requested_days, status, starts_at, ends_at, rejection_reason, created_at')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && !isNotFound(error)) {
    logger.error({ message: 'Failed to fetch promotion', sellerId, error: error.message });
    throw new AppError('Failed to fetch promotion status', 500);
  }

  return promotion ?? null;
};

// ─────────────────────────────────────────────────────────────
// GET HERO ADS
// Returns active promotions in the 'hero' placement visible on the homepage
// ─────────────────────────────────────────────────────────────
const getHeroAds = async () => {
  const now = new Date().toISOString();

  const { data: promotions, error } = await supabaseAdmin
    .from('promotions')
    .select(`
      id, placement, starts_at, ends_at,
      seller:sellers (
        id, shop_name, bio, avatar_url, city, is_verified,
        category:categories ( id, name, slug )
      )
    `)
    .eq('placement', 'hero')
    .eq('status', 'active')
    .eq('is_active', true)
    .gt('ends_at', now)
    .order('starts_at', { ascending: false })
    .limit(6);

  if (error) {
    logger.error({ message: 'Failed to fetch hero ads', error: error.message });
    throw new AppError('Failed to fetch featured sellers', 500);
  }

  return (promotions || []).map((p) => ({
    id:        p.id,
    seller:    p.seller,
    starts_at: p.starts_at,
    ends_at:   p.ends_at,
  }));
};

// ─────────────────────────────────────────────────────────────
// GET BROWSE ADS
// Returns active promotions in the 'browse' placement for BrowsePage
// ─────────────────────────────────────────────────────────────
const getBrowseAds = async () => {
  const now = new Date().toISOString();

  const { data: promotions, error } = await supabaseAdmin
    .from('promotions')
    .select(`
      id, placement, starts_at, ends_at,
      seller:sellers (
        id, shop_name, bio, avatar_url, city, is_verified,
        category:categories ( id, name, slug )
      )
    `)
    .eq('placement', 'browse')
    .eq('status', 'active')
    .eq('is_active', true)
    .gt('ends_at', now)
    .order('starts_at', { ascending: false })
    .limit(4);

  if (error) {
    logger.error({ message: 'Failed to fetch browse ads', error: error.message });
    throw new AppError('Failed to fetch promoted sellers', 500);
  }

  return (promotions || []).map((p) => ({
    id:        p.id,
    seller:    p.seller,
    starts_at: p.starts_at,
    ends_at:   p.ends_at,
  }));
};

// ─────────────────────────────────────────────────────────────
// GET FEATURED PRODUCTS
// Returns active product-level promotions (featured / category_top)
// Optionally filtered by category_id
// ─────────────────────────────────────────────────────────────
const getFeaturedProducts = async (categoryId = null) => {
  const now = new Date().toISOString();

  const { data: promotions, error } = await supabaseAdmin
    .from('promotions')
    .select(`
      id, placement,
      product:products (
        id, name, price, price_min, price_max, avg_rating, view_count,
        is_active, is_featured, is_new, completion_days, category_id,
        product_images ( image_url, position ),
        seller:sellers ( id, shop_name, is_verified ),
        categories ( id, name, slug )
      )
    `)
    .not('product_id', 'is', null)
    .eq('status', 'active')
    .eq('is_active', true)
    .gt('ends_at', now)
    .in('placement', ['featured', 'category_top'])
    .order('starts_at', { ascending: false })
    .limit(12);

  if (error) {
    logger.error({ message: 'Failed to fetch featured products', error: error.message });
    throw new AppError('Failed to fetch featured products', 500);
  }

  let results = (promotions || [])
    .filter((p) => p.product && p.product.is_active !== false)
    .map((p) => ({ ...p.product, _placement: p.placement }));

  if (categoryId) {
    results = results.filter((p) => p.category_id === categoryId);
  }

  // Deduplicate by product id
  const seen = new Set();
  return results.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
};

// ─────────────────────────────────────────────────────────────
// GET MY PRODUCT PROMOTIONS
// Returns all product-level promotions for the authenticated seller
// ─────────────────────────────────────────────────────────────
const getMyProductPromotions = async (sellerId) => {
  const { data, error } = await supabaseAdmin
    .from('promotions')
    .select(`
      id, placement, status, requested_days, starts_at, ends_at, rejection_reason, created_at,
      product:products ( id, name )
    `)
    .eq('seller_id', sellerId)
    .not('product_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    logger.error({ message: 'Failed to fetch product promotions', sellerId, error: error.message });
    throw new AppError('Failed to fetch product promotions', 500);
  }

  return data || [];
};

module.exports = {
  requestPromotion,
  getMyPromotion,
  getMyProductPromotions,
  getHeroAds,
  getBrowseAds,
  getFeaturedProducts,
};
