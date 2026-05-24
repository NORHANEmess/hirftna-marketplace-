'use strict';

const { supabaseAdmin }            = require('../config/supabase');
const { AppError }                 = require('../middlewares/error.middleware');
const logger                       = require('../utils/logger');
const { updateVerificationStatus } = require('./verification.service');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const SELLER_PUBLIC_COLUMNS = `
  id, user_id, shop_name, description, story,
  location, category_id, avg_rating, is_verified,
  created_at, updated_at, avatar_url, bio, city,
  user:users (
    id, full_name, avatar_url
  ),
  category:categories (
    id, name, slug
  )
`.trim();

const SELLER_DETAIL_COLUMNS = `
  id, shop_name, description, story,
  location, category_id, avg_rating, is_verified,
  created_at, updated_at, avatar_url,
  total_sales, user_id, bio, city,
  user:users (
    id, full_name, avatar_url, email
  ),
  category:categories (
    id, name, slug
  )
`.trim();

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const isNotFound = (error) => error?.code === 'PGRST116';

const getSortOrder = (sort) => {
  switch (sort) {
    case 'oldest': return { column: 'created_at', ascending: true  };
    case 'rating': return { column: 'avg_rating',  ascending: false };
    case 'newest':
    default:       return { column: 'created_at', ascending: false };
  }
};

const normalizeSeller = (seller) => {
  if (!seller) return null;

  const description = seller.description ?? seller.bio ?? null;
  const location = seller.location ?? seller.city ?? null;

  return {
    ...seller,
    description,
    bio: seller.bio ?? description,
    location,
    city: seller.city ?? location,
  };
};

// ─────────────────────────────────────────────────────────────
// GET ALL SELLERS
// Public — paginated list of verified sellers
// ─────────────────────────────────────────────────────────────
const getAllSellers = async (query) => {
  const {
    page        = 1,
    limit       = 20,
    category_id,
    search,
    sort        = 'newest',
  } = query;

  const offset = (page - 1) * limit;
  const { column, ascending } = getSortOrder(sort);

  let dbQuery = supabaseAdmin
    .from('sellers')
    .select(SELLER_PUBLIC_COLUMNS, { count: 'exact' });

  if (category_id) dbQuery = dbQuery.eq('category_id', category_id);
  if (search)      dbQuery = dbQuery.ilike('shop_name', `%${search}%`);

  dbQuery = dbQuery
    .order(column, { ascending })
    .range(offset, offset + limit - 1);

  const { data: sellers, error, count } = await dbQuery;

  if (error) {
    logger.error({
      message: 'Failed to fetch sellers',
      error:   error.message,
      code:    error.code,
    });
    throw new AppError('Failed to fetch sellers', 500);
  }

  return {
    sellers:    (sellers || []).map(normalizeSeller),
    pagination: { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// GET SELLER BY ID
// Public — full profile with products and reviews
// FIX — Added error handling for products/reviews queries
// ─────────────────────────────────────────────────────────────
const getSellerById = async (id) => {
  if (!id) throw new AppError('Seller ID is required', 400);

  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select(SELLER_PUBLIC_COLUMNS)
    .eq('id', id)
    .single();

  if (error) {
    if (isNotFound(error)) throw new AppError('Seller not found', 404);
    logger.error({
      message: 'Failed to fetch seller',
      id, error: error.message, code: error.code,
    });
    throw new AppError('Failed to fetch seller', 500);
  }

  // FIX — Handle products query error
  const { data: products, error: productsError } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, price, price_min, price_max, avg_rating,
      view_count, created_at,
      product_images (
        id, image_url, position
      )
    `)
    .eq('seller_id', id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(12);

  if (productsError) {
    logger.error({
      message:  'Failed to fetch seller products',
      sellerId: id,
      error:    productsError.message,
    });
    // Don't throw — return seller without products
    // Seller profile is still useful without products
  }

  // FIX — Handle reviews query error
  const { data: reviews, error: reviewsError } = await supabaseAdmin
    .from('ratings')
    .select(`
      id, rating, created_at,
      client:users (
        id, full_name, avatar_url
      )
    `)
    .eq('seller_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (reviewsError) {
    logger.error({
      message:  'Failed to fetch seller reviews',
      sellerId: id,
      error:    reviewsError.message,
    });
    // Don't throw — return seller without reviews
  }

  return normalizeSeller({
    ...seller,
    products: products || [],
    reviews: reviews || [],
  });
};

// ─────────────────────────────────────────────────────────────
// GET MY SELLER PROFILE
// Seller only — returns own full profile
// ─────────────────────────────────────────────────────────────
const getMySellerProfile = async (userId) => {
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select(SELLER_DETAIL_COLUMNS)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (isNotFound(error)) {
      throw new AppError(
        'Seller profile not found. Please create your shop first.',
        404
      );
    }
    logger.error({
      message: 'Failed to fetch seller profile',
      userId,
      error:   error.message,
    });
    throw new AppError('Failed to fetch seller profile', 500);
  }

  return normalizeSeller(seller);
};

// ─────────────────────────────────────────────────────────────
// CREATE SELLER PROFILE
// Seller only — one shop per user
// FIX — Proper .single() error handling
// FIX — Handle user role update failure
// ─────────────────────────────────────────────────────────────
const createSeller = async (userId, sellerData) => {
  // FIX 1 — Properly handle existing seller check
  // .single() throws PGRST116 if no row found — that's expected
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .single();

  // If error is NOT "not found" → real DB error
  if (existingError && !isNotFound(existingError)) {
    logger.error({
      message: 'Failed to check existing seller profile',
      userId,
      error:   existingError.message,
    });
    throw new AppError('Failed to verify seller status. Please try again.', 500);
  }

  // If existing found → already has a shop
  if (existing) {
    throw new AppError(
      'You already have a seller profile. Use PUT to update it.',
      409
    );
  }

  // Check user role
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new AppError('User not found', 404);
  }

  if (user.role !== 'seller') {
    throw new AppError(
      'Only users with seller role can create a shop.',
      403
    );
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
  } = sellerData;

  const resolvedDescription = description ?? bio ?? null;
  const resolvedBio = bio ?? description ?? null;
  const resolvedLocation = location ?? city ?? null;
  const resolvedCity = city ?? location ?? null;

  // Create seller profile
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .insert({
      user_id:     userId,
      shop_name,
      description: resolvedDescription,
      story:       story       || null,
      location:    resolvedLocation,
      category_id: category_id || null,
      avatar_url:  avatar_url  || null,
      bio:         resolvedBio,
      city:        resolvedCity,
      is_verified: false,
    })
    .select(SELLER_DETAIL_COLUMNS)
    .single();

  if (error) {
    logger.error({
      message: 'Failed to create seller profile',
      userId,
      error:   error.message,
      code:    error.code,
    });

    if (error.code === '23505') {
      throw new AppError('You already have a seller profile.', 409);
    }

    throw new AppError('Failed to create seller profile', 500);
  }

  // FIX 2 — Handle user role update failure
  const { error: roleError } = await supabaseAdmin
    .from('users')
    .update({ role: 'seller', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (roleError) {
    // Log error but don't fail — seller profile was created
    // Admin can manually fix the role if needed
    logger.error({
      message: 'Failed to update user role after seller creation',
      userId,
      error:   roleError.message,
    });
  }

  logger.info({
    message:  'Seller profile created',
    sellerId: seller.id,
    userId,
  });

  return normalizeSeller(seller);
};

// ─────────────────────────────────────────────────────────────
// UPDATE SELLER PROFILE
// Seller only — must own the profile
// ─────────────────────────────────────────────────────────────
const updateSeller = async (userId, sellerId, updates) => {
  // Verify ownership
  const { data: seller, error: findError } = await supabaseAdmin
    .from('sellers')
    .select('id, user_id')
    .eq('id', sellerId)
    .single();

  if (findError) {
    if (isNotFound(findError)) throw new AppError('Seller profile not found', 404);
    throw new AppError('Failed to find seller profile', 500);
  }

  // Security — only owner can update
  if (seller.user_id !== userId) {
    throw new AppError(
      'You do not have permission to update this profile',
      403
    );
  }

  // Build safe update object
  const safeUpdates = {};
  if (updates.shop_name   !== undefined) safeUpdates.shop_name   = updates.shop_name;
  if (updates.story       !== undefined) safeUpdates.story       = updates.story;
  if (updates.avatar_url  !== undefined) safeUpdates.avatar_url  = updates.avatar_url;

  const resolvedDescription = updates.description ?? updates.bio;
  if (resolvedDescription !== undefined) {
    safeUpdates.description = resolvedDescription;
    safeUpdates.bio = updates.bio ?? resolvedDescription;
  } else if (updates.bio !== undefined) {
    safeUpdates.bio = updates.bio;
  }

  const resolvedLocation = updates.location ?? updates.city;
  if (resolvedLocation !== undefined) {
    safeUpdates.location = resolvedLocation;
    safeUpdates.city = updates.city ?? resolvedLocation;
  } else if (updates.city !== undefined) {
    safeUpdates.city = updates.city;
  }

  if (updates.category_id !== undefined) {
    safeUpdates.category_id = updates.category_id || null;
  }

  safeUpdates.updated_at = new Date().toISOString();

  const { data: updatedSeller, error } = await supabaseAdmin
    .from('sellers')
    .update(safeUpdates)
    .eq('id', sellerId)
    .select(SELLER_DETAIL_COLUMNS)
    .single();

  if (error) {
    logger.error({
      message:  'Failed to update seller profile',
      sellerId,
      error:    error.message,
      code:     error.code,
    });
    throw new AppError('Failed to update seller profile', 500);
  }

  logger.info({ message: 'Seller profile updated', sellerId, userId });

  // Fire-and-forget: profile completeness is a verification criterion
  updateVerificationStatus(sellerId);

  return normalizeSeller(updatedSeller);
};

// ─────────────────────────────────────────────────────────────
// VERIFY SELLER
// Admin only — enforced at route level AND documented here
//
// FIX 3 — Defense in depth note:
// Admin role is enforced by requireRole('admin') in routes
// This service does NOT re-check admin role
// because userId is not passed here — only sellerId
// Route-level middleware is the security layer
// ─────────────────────────────────────────────────────────────
const verifySeller = async (sellerId) => {
  if (!sellerId) throw new AppError('Seller ID is required', 400);

  const { data: seller, error: findError } = await supabaseAdmin
    .from('sellers')
    .select('id, is_verified, shop_name')
    .eq('id', sellerId)
    .single();

  if (findError) {
    if (isNotFound(findError)) throw new AppError('Seller not found', 404);
    throw new AppError('Failed to find seller', 500);
  }

  if (seller.is_verified) {
    throw new AppError('Seller is already verified', 409);
  }

  const { data: updatedSeller, error } = await supabaseAdmin
    .from('sellers')
    .update({
      is_verified:    true,
      admin_override: true,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', sellerId)
    .select('id, shop_name, is_verified')
    .single();

  if (error) {
    logger.error({
      message:  'Failed to verify seller',
      sellerId,
      error:    error.message,
    });
    throw new AppError('Failed to verify seller', 500);
  }

  logger.info({
    message:  'Seller verified',
    sellerId,
    shopName: updatedSeller.shop_name,
  });

  return updatedSeller;
};

// ─────────────────────────────────────────────────────────────
// GET SELLER ANALYTICS
// Seller only — basic analytics for dashboard
// FIX — Added error handling on all count queries
// ─────────────────────────────────────────────────────────────
const getSellerAnalytics = async (userId) => {
  const seller = await getMySellerProfile(userId);

  // FIX — Handle each count query error
  const [
    { count: totalProducts,  error: e1 },
    { count: activeProducts, error: e2 },
    { count: totalOrders,    error: e3 },
    { count: pendingOrders,  error: e4 },
  ] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', seller.id),

    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', seller.id)
      .eq('is_active', true),

    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', seller.id),

    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', seller.id)
      .eq('status', 'pending'),
  ]);

  // Log any count errors but don't throw
  [e1, e2, e3, e4].forEach((err, i) => {
    if (err) {
      logger.error({
        message:  `Analytics count query ${i + 1} failed`,
        sellerId: seller.id,
        error:    err.message,
      });
    }
  });

  // FIX — Handle top products query error
  const { data: topProducts, error: topError } = await supabaseAdmin
    .from('products')
    .select('id, name, view_count, avg_rating, price')
    .eq('seller_id', seller.id)
    .eq('is_active', true)
    .order('view_count', { ascending: false })
    .limit(5);

  if (topError) {
    logger.error({
      message:  'Failed to fetch top products for analytics',
      sellerId: seller.id,
      error:    topError.message,
    });
  }

  return {
    seller: {
      id:          seller.id,
      shop_name:   seller.shop_name,
      avg_rating:  seller.avg_rating,
      is_verified: seller.is_verified,
      total_sales: seller.total_sales,
    },
    products: {
      total:  totalProducts  || 0,
      active: activeProducts || 0,
    },
    orders: {
      total:   totalOrders   || 0,
      pending: pendingOrders || 0,
    },
    topProducts: topProducts || [],
  };
};

module.exports = {
  getAllSellers,
  getSellerById,
  getMySellerProfile,
  createSeller,
  updateSeller,
  verifySeller,
  getSellerAnalytics,
};
