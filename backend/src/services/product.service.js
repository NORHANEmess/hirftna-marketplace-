'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const PRODUCT_LIST_COLUMNS = `
  id, name, price, stock, avg_rating,
  view_count, is_active, created_at,
  category_id, seller_id,
  seller:sellers (
    id, shop_name, avg_rating, user_id
  ),
  category:categories (
    id, name, slug
  ),
  images:product_images (
    id, url, position
  )
`.trim();

const PRODUCT_DETAIL_COLUMNS = `
  id, name, description, price, stock,
  avg_rating, view_count, is_active,
  created_at, updated_at,
  category_id, seller_id,
  seller:sellers (
    id, shop_name, description, location,
    avg_rating, is_verified, user_id,
    category:categories ( id, name, slug )
  ),
  category:categories (
    id, name, slug
  ),
  images:product_images (
    id, url, position
  )
`.trim();

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const isNotFound = (error) =>
  error?.code === 'PGRST116' || error?.code === '406';

const getSortOrder = (sort) => {
  switch (sort) {
    case 'oldest':     return { column: 'created_at', ascending: true  };
    case 'price_asc':  return { column: 'price',      ascending: true  };
    case 'price_desc': return { column: 'price',      ascending: false };
    case 'rating':     return { column: 'avg_rating', ascending: false };
    case 'newest':
    default:           return { column: 'created_at', ascending: false };
  }
};

// ─────────────────────────────────────────────────────────────
// FIX 1 — Atomic view count using PostgreSQL RPC function
// Prevents race conditions on simultaneous views
// ─────────────────────────────────────────────────────────────
const incrementViewCount = async (productId) => {
  const { error } = await supabaseAdmin
    .rpc('increment_product_view', { product_id: productId });

  if (error) {
    logger.warn({
      message:   'Failed to increment view count',
      productId,
      error:     error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// FIX 4 — Track browsing event with proper error handling
// ─────────────────────────────────────────────────────────────
const trackBrowsingEvent = async (userId, productId, eventType = 'view') => {
  const { error } = await supabaseAdmin
    .from('browsing_events')
    .insert({
      user_id:    userId,
      product_id: productId,
      event_type: eventType,
    });

  if (error) {
    // Log as error not warn — tracking failures affect analytics
    logger.error({
      message:   'Failed to track browsing event',
      userId,
      productId,
      eventType,
      error:     error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET ALL PRODUCTS
// Public — with filters, search, pagination
// ─────────────────────────────────────────────────────────────
const getAllProducts = async (query) => {
  const {
    page        = 1,
    limit       = 20,
    category_id,
    search,
    sort        = 'newest',
    min_price,
    max_price,
  } = query;

  const offset = (page - 1) * limit;
  const { column, ascending } = getSortOrder(sort);

  let dbQuery = supabaseAdmin
    .from('products')
    .select(PRODUCT_LIST_COLUMNS, { count: 'exact' })
    .eq('is_active', true);

  if (category_id) dbQuery = dbQuery.eq('category_id', category_id);
  if (min_price !== undefined) dbQuery = dbQuery.gte('price', min_price);
  if (max_price !== undefined) dbQuery = dbQuery.lte('price', max_price);

  if (search) {
    dbQuery = dbQuery.textSearch('fts', search, {
      type:   'websearch',
      config: 'english',
    });
  }

  dbQuery = dbQuery
    .order(column, { ascending })
    .range(offset, offset + limit - 1);

  const { data: products, error, count } = await dbQuery;

  if (error) {
    logger.error({
      message: 'Failed to fetch products',
      error:   error.message,
      code:    error.code,
    });
    throw new AppError('Failed to fetch products', 500);
  }

  return {
    products: products || [],
    pagination: { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// GET PRODUCT BY ID
// Public — increments view_count atomically
// ─────────────────────────────────────────────────────────────
const getProductById = async (id, userId = null) => {
  if (!id) throw new AppError('Product ID is required', 400);

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_DETAIL_COLUMNS)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error) {
    if (isNotFound(error)) throw new AppError('Product not found', 404);
    logger.error({
      message: 'Failed to fetch product',
      id, error: error.message, code: error.code,
    });
    throw new AppError('Failed to fetch product', 500);
  }

  // FIX 1 — Atomic increment (fire and forget)
  incrementViewCount(id);

  // Track browsing event if user logged in (fire and forget)
  if (userId) trackBrowsingEvent(userId, id, 'view');

  return product;
};

// ─────────────────────────────────────────────────────────────
// GET SELLER BY USER ID
// FIX 3 — Internal helper used by multiple functions
// ─────────────────────────────────────────────────────────────
const getSellerByUserId = async (userId) => {
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('id, user_id, is_verified')
    .eq('user_id', userId)
    .single();

  if (error || !seller) {
    throw new AppError(
      'Seller profile not found. Please create your shop first.',
      404
    );
  }

  return seller;
};

// ─────────────────────────────────────────────────────────────
// VERIFY PRODUCT OWNERSHIP
// ─────────────────────────────────────────────────────────────
const verifyProductOwnership = async (productId, sellerId) => {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('id, seller_id')
    .eq('id', productId)
    .single();

  if (error) {
    if (isNotFound(error)) throw new AppError('Product not found', 404);
    throw new AppError('Failed to verify product ownership', 500);
  }

  if (product.seller_id !== sellerId) {
    throw new AppError(
      'You do not have permission to modify this product',
      403
    );
  }

  return product;
};

// ─────────────────────────────────────────────────────────────
// GET PRODUCT BY ID FOR SELLER (includes inactive)
// ─────────────────────────────────────────────────────────────
const getProductByIdForSeller = async (id) => {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_DETAIL_COLUMNS)
    .eq('id', id)
    .single();

  if (error) {
    if (isNotFound(error)) throw new AppError('Product not found', 404);
    throw new AppError('Failed to fetch product', 500);
  }

  return product;
};

// ─────────────────────────────────────────────────────────────
// CREATE PRODUCT
// Seller only
// FIX 2 — Rollback product if images fail
// ─────────────────────────────────────────────────────────────
const createProduct = async (userId, productData) => {
  const seller = await getSellerByUserId(userId);

  const {
    name, description, price,
    stock, category_id, is_active, images,
  } = productData;

  // Step 1 — Create product
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert({
      seller_id:   seller.id,
      category_id,
      name,
      description,
      price,
      stock:     stock     ?? 0,
      is_active: is_active ?? true,
    })
    .select('id, name, price, stock, is_active, created_at')
    .single();

  if (error) {
    logger.error({
      message: 'Failed to create product',
      userId,  error: error.message, code: error.code,
    });
    throw new AppError('Failed to create product', 500);
  }

  // Step 2 — Insert images
  // FIX 2 — Rollback product if images fail
  if (images && images.length > 0) {
    const imageRows = images.map((url, index) => ({
      product_id: product.id,
      url,
      position:   index,
    }));

    const { error: imageError } = await supabaseAdmin
      .from('product_images')
      .insert(imageRows);

    if (imageError) {
      logger.error({
        message:   'Failed to insert product images — rolling back',
        productId: product.id,
        error:     imageError.message,
      });

      // FIX 2 — Rollback: delete the product to avoid orphaned records
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', product.id);

      throw new AppError(
        'Failed to save product images. Please try again.',
        500
      );
    }
  }

  logger.info({
    message:   'Product created',
    productId: product.id,
    sellerId:  seller.id,
  });

  return getProductByIdForSeller(product.id);
};

// ─────────────────────────────────────────────────────────────
// UPDATE PRODUCT
// Seller only — must own the product
// ─────────────────────────────────────────────────────────────
const updateProduct = async (userId, productId, updates) => {
  const seller = await getSellerByUserId(userId);
  await verifyProductOwnership(productId, seller.id);

  const safeUpdates = {};
  if (updates.name        !== undefined) safeUpdates.name        = updates.name;
  if (updates.description !== undefined) safeUpdates.description = updates.description;
  if (updates.price       !== undefined) safeUpdates.price       = updates.price;
  if (updates.stock       !== undefined) safeUpdates.stock       = updates.stock;
  if (updates.category_id !== undefined) safeUpdates.category_id = updates.category_id;
  if (updates.is_active   !== undefined) safeUpdates.is_active   = updates.is_active;
  safeUpdates.updated_at = new Date().toISOString();

  const { data: updatedProduct, error } = await supabaseAdmin
    .from('products')
    .update(safeUpdates)
    .eq('id', productId)
    .select(PRODUCT_DETAIL_COLUMNS)
    .single();

  if (error) {
    logger.error({
      message: 'Failed to update product',
      productId, error: error.message, code: error.code,
    });
    throw new AppError('Failed to update product', 500);
  }

  logger.info({ message: 'Product updated', productId, sellerId: seller.id });

  return updatedProduct;
};

// ─────────────────────────────────────────────────────────────
// DELETE PRODUCT (soft delete)
// Seller only — must own the product
// ─────────────────────────────────────────────────────────────
const deleteProduct = async (userId, productId) => {
  const seller = await getSellerByUserId(userId);
  await verifyProductOwnership(productId, seller.id);

  const { error } = await supabaseAdmin
    .from('products')
    .update({
      is_active:  false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId);

  if (error) {
    logger.error({
      message: 'Failed to delete product',
      productId, error: error.message,
    });
    throw new AppError('Failed to delete product', 500);
  }

  logger.info({
    message: 'Product soft deleted',
    productId, sellerId: seller.id,
  });
};

// ─────────────────────────────────────────────────────────────
// GET MY PRODUCTS
// Seller only — returns ALL products (active + inactive)
// ─────────────────────────────────────────────────────────────
const getMyProducts = async (userId, query) => {
  const { page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  const seller = await getSellerByUserId(userId);

  const { data: products, error, count } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_LIST_COLUMNS, { count: 'exact' })
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error({
      message:  'Failed to fetch seller products',
      sellerId: seller.id,
      error:    error.message,
    });
    throw new AppError('Failed to fetch your products', 500);
  }

  return {
    products: products || [],
    pagination: { page, limit, total: count || 0 },
  };
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getSellerByUserId,
  verifyProductOwnership,
};
