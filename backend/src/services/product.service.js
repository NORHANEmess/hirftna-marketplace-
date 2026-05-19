'use strict';

const { supabaseAdmin }            = require('../config/supabase');
const { AppError }                 = require('../middlewares/error.middleware');
const logger                       = require('../utils/logger');
const { updateVerificationStatus } = require('./verification.service');

const PRODUCT_BASE_COLUMNS = `
  id, seller_id, category_id, name, description, price,
  avg_rating, view_count, is_active, created_at, updated_at,
  price_min, price_max, completion_days, is_featured, is_new
`.trim();

const SELLER_COLUMNS = `
  id, user_id, shop_name, description, story, location, category_id,
  avatar_url, is_verified, avg_rating, total_sales, created_at,
  updated_at, response_time_hours, bio, city
`.trim();

const CATEGORY_COLUMNS = 'id, name, slug, icon_url';
const PRODUCT_IMAGE_COLUMNS = 'id, product_id, image_url, position, created_at';

const isNotFound = (error) =>
  error?.code === 'PGRST116' ||
  (error?.message || '').includes('0 rows');

const getSortOrder = (sort) => {
  switch (sort) {
    case 'price_asc':
      return { column: 'price', ascending: true };
    case 'price_desc':
      return { column: 'price', ascending: false };
    case 'rating':
      return { column: 'avg_rating', ascending: false };
    case 'newest':
    default:
      return { column: 'created_at', ascending: false };
  }
};

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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

const normalizeCategory = (category) => (category ? { ...category } : null);

const normalizeProductImages = (images) =>
  (images || [])
    .filter((image) => image?.image_url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

const attachRelations = (products, relationData) => {
  const {
    sellersById,
    categoriesById,
    imagesByProductId,
    reviewCountsByProductId,
  } = relationData;

  return products.map((product) => {
    const seller = normalizeSeller(sellersById.get(product.seller_id) || null);
    const category = normalizeCategory(categoriesById.get(product.category_id) || null);
    const images = normalizeProductImages(imagesByProductId.get(product.id) || []);
    const reviewCount = reviewCountsByProductId.get(product.id) || 0;

    return {
      ...product,
      seller,
      sellers: seller,
      category,
      categories: category,
      product_images: images,
      images,
      image_url: images[0]?.image_url ?? null,
      review_count: reviewCount,
    };
  });
};

const loadRelationMaps = async (products) => {
  const productIds = [...new Set(products.map((product) => product.id).filter(Boolean))];
  const sellerIds = [...new Set(products.map((product) => product.seller_id).filter(Boolean))];
  const categoryIds = [...new Set(products.map((product) => product.category_id).filter(Boolean))];

  const [
    sellersResult,
    categoriesResult,
    imagesResult,
    reviewsResult,
  ] = await Promise.all([
    sellerIds.length > 0
      ? supabaseAdmin.from('sellers').select(SELLER_COLUMNS).in('id', sellerIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? supabaseAdmin.from('categories').select(CATEGORY_COLUMNS).in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length > 0
      ? supabaseAdmin
          .from('product_images')
          .select(PRODUCT_IMAGE_COLUMNS)
          .in('product_id', productIds)
          .order('position', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    productIds.length > 0
      ? supabaseAdmin.from('reviews').select('product_id').in('product_id', productIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (sellersResult.error) {
    logger.error({
      message: 'Failed to fetch product sellers',
      error: sellersResult.error.message,
      code: sellersResult.error.code,
    });
    throw new AppError('Failed to fetch products', 500);
  }

  if (categoriesResult.error) {
    logger.error({
      message: 'Failed to fetch product categories',
      error: categoriesResult.error.message,
      code: categoriesResult.error.code,
    });
    throw new AppError('Failed to fetch products', 500);
  }

  if (imagesResult.error) {
    logger.error({
      message: 'Failed to fetch product images',
      error: imagesResult.error.message,
      code: imagesResult.error.code,
    });
    throw new AppError('Failed to fetch products', 500);
  }

  if (reviewsResult.error) {
    logger.error({
      message: 'Failed to fetch product review counts',
      error: reviewsResult.error.message,
      code: reviewsResult.error.code,
    });
    throw new AppError('Failed to fetch products', 500);
  }

  const sellersById = new Map((sellersResult.data || []).map((seller) => [seller.id, seller]));
  const categoriesById = new Map((categoriesResult.data || []).map((category) => [category.id, category]));

  const imagesByProductId = new Map();
  for (const image of imagesResult.data || []) {
    if (!imagesByProductId.has(image.product_id)) {
      imagesByProductId.set(image.product_id, []);
    }
    imagesByProductId.get(image.product_id).push(image);
  }

  const reviewCountsByProductId = new Map();
  for (const review of reviewsResult.data || []) {
    reviewCountsByProductId.set(
      review.product_id,
      (reviewCountsByProductId.get(review.product_id) || 0) + 1
    );
  }

  return {
    sellersById,
    categoriesById,
    imagesByProductId,
    reviewCountsByProductId,
  };
};

const hydrateProducts = async (products) => {
  if (!products || products.length === 0) {
    return [];
  }

  const relationData = await loadRelationMaps(products);
  return attachRelations(products, relationData);
};

const getProductsByIds = async (productIds, options = {}) => {
  const uniqueIds = [...new Set((productIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  let query = supabaseAdmin
    .from('products')
    .select(PRODUCT_BASE_COLUMNS)
    .in('id', uniqueIds);

  if (options.includeInactive === false) {
    query = query.eq('is_active', true);
  }

  const { data: products, error } = await query;

  if (error) {
    logger.error({
      message: 'Failed to fetch products by IDs',
      error: error.message,
      code: error.code,
      productIds: uniqueIds,
    });
    throw new AppError('Failed to fetch products', 500);
  }

  const hydratedProducts = await hydrateProducts(products || []);
  const productsById = new Map(hydratedProducts.map((product) => [product.id, product]));

  return uniqueIds
    .map((productId) => productsById.get(productId))
    .filter(Boolean);
};

const getSellerByUserId = async (userId) => {
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('id, user_id, is_verified, shop_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error({ message: 'Failed to fetch seller', userId, error: error.message });
    throw new AppError('Failed to fetch seller profile', 500);
  }

  if (!seller) {
    throw new AppError(
      'Seller profile not found. Please create your shop profile first.',
      404
    );
  }

  return seller;
};

const verifyProductOwnership = async (productId, sellerId) => {
  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('id, seller_id, price, price_min, price_max')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    logger.error({
      message: 'Failed to verify product ownership',
      productId,
      sellerId,
      error: error.message,
    });
    throw new AppError('Failed to verify product ownership', 500);
  }

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (product.seller_id !== sellerId) {
    throw new AppError('You do not have permission to modify this product', 403);
  }

  return product;
};

const resolveStoredPrice = ({ price, price_min, price_max, existingPrice }) => {
  if (price !== undefined && price !== null) return price;
  if (price_min !== undefined && price_min !== null) return price_min;
  if (price_max !== undefined && price_max !== null) return price_max;
  if (existingPrice !== undefined && existingPrice !== null) return existingPrice;
  return undefined;
};

const incrementViewCount = async (productId) => {
  const { error } = await supabaseAdmin.rpc('increment_product_view', {
    product_id: productId,
  });

  if (error) {
    logger.warn({
      message: 'Failed to increment view count',
      productId,
      error: error.message,
    });
  }
};

const trackBrowsingEvent = async (userId, productId, eventType = 'view') => {
  const { error } = await supabaseAdmin
    .from('browsing_events')
    .insert({ user_id: userId, product_id: productId, event_type: eventType });

  if (error) {
    logger.error({
      message: 'Failed to track browsing event',
      userId,
      productId,
      eventType,
      error: error.message,
    });
  }
};

const fetchSingleProduct = async (id, { includeInactive = true } = {}) => {
  let query = supabaseAdmin
    .from('products')
    .select(PRODUCT_BASE_COLUMNS)
    .eq('id', id);

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data: product, error } = await query.maybeSingle();

  if (error) {
    logger.error({
      message: 'Failed to fetch product',
      id,
      includeInactive,
      error: error.message,
      code: error.code,
    });
    throw new AppError('Failed to fetch product', 500);
  }

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const [hydratedProduct] = await hydrateProducts([product]);
  return hydratedProduct;
};

const getProductByIdForSeller = async (id) =>
  fetchSingleProduct(id, { includeInactive: true });

const getAllProducts = async (query) => {
  const page = toPositiveInteger(query.page, 1);
  const limit = toPositiveInteger(query.limit, 20);
  const offset =
    query.offset !== undefined && Number.isFinite(Number(query.offset))
      ? Number(query.offset)
      : (page - 1) * limit;

  const {
    category_id,
    category,
    search,
    q,
    sort = 'newest',
    min,
    min_price,
    max,
    max_price,
    seller_id,
  } = query;

  const { column, ascending } = getSortOrder(sort);
  let resolvedCategoryId = category_id;

  if (!resolvedCategoryId && category) {
    const { data: matchedCategory, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', category)
      .maybeSingle();

    if (categoryError) {
      logger.error({
        message: 'Failed to resolve category slug',
        category,
        error: categoryError.message,
        code: categoryError.code,
      });
      throw new AppError('Failed to fetch products', 500);
    }

    if (!matchedCategory) {
      return {
        products: [],
        pagination: { page, limit, total: 0 },
      };
    }

    resolvedCategoryId = matchedCategory.id;
  }

  // Filter products to verified sellers only using an inner join — avoids loading
  // all seller IDs into memory first.
  let dbQuery = supabaseAdmin
    .from('products')
    .select(`${PRODUCT_BASE_COLUMNS}, sellers!inner(id)`, { count: 'exact' })
    .eq('sellers.is_verified', true)
    .eq('is_active', true);

  if (resolvedCategoryId) dbQuery = dbQuery.eq('category_id', resolvedCategoryId);
  if (seller_id) dbQuery = dbQuery.eq('seller_id', seller_id);

  const searchTerm = (q ?? search ?? '').trim();
  if (searchTerm) {
    dbQuery = dbQuery.ilike('name', `%${searchTerm}%`);
  }

  const effectiveMin = min ?? min_price;
  const effectiveMax = max ?? max_price;
  if (effectiveMin !== undefined) dbQuery = dbQuery.gte('price', effectiveMin);
  if (effectiveMax !== undefined) dbQuery = dbQuery.lte('price', effectiveMax);

  dbQuery = dbQuery
    .order(column, { ascending })
    .range(offset, offset + limit - 1);

  const { data: products, error, count } = await dbQuery;

  if (error) {
    logger.error({
      message: 'Failed to fetch products',
      error: error.message,
      code: error.code,
    });
    throw new AppError('Failed to fetch products', 500);
  }

  return {
    products: await hydrateProducts(products || []),
    pagination: { page, limit, total: count || 0 },
  };
};

const getProductById = async (id, user = null) => {
  if (!id) throw new AppError('Product ID is required', 400);

  const product = await fetchSingleProduct(id, { includeInactive: false });

  // Hide products from unverified sellers except for admins
  if (!product.seller?.is_verified && user?.role !== 'admin') {
    throw new AppError('Product not found', 404);
  }

  incrementViewCount(id);
  if (user?.id) trackBrowsingEvent(user.id, id, 'view');

  return product;
};

const createProduct = async (userId, productData) => {
  const seller = await getSellerByUserId(userId);

  const {
    name,
    description,
    price,
    price_min,
    price_max,
    completion_days,
    category_id,
    is_active = true,
    images = [],
  } = productData;

  const storedPrice = resolveStoredPrice({ price, price_min, price_max });
  if (storedPrice === undefined) {
    throw new AppError('A price is required to create a product', 400);
  }

  const payload = {
    seller_id: seller.id,
    name,
    description: description ?? null,
    price: storedPrice,
    category_id: category_id || null,
    is_active,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    price_min: price_min ?? null,
    price_max: price_max ?? null,
    completion_days: completion_days ?? null,
  };

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    logger.error({ message: 'Failed to create product', userId, error: error.message });
    throw new AppError('Failed to create product', 500);
  }

  const imageRows = (images || [])
    .filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.trim())
    .map((imageUrl, index) => ({
      product_id: product.id,
      image_url: imageUrl,
      position: index,
    }));

  if (imageRows.length > 0) {
    const { error: imageError } = await supabaseAdmin
      .from('product_images')
      .insert(imageRows);

    if (imageError) {
      logger.error({
        message: 'Failed to insert product images, rolling back product',
        productId: product.id,
        error: imageError.message,
      });

      await supabaseAdmin.from('products').delete().eq('id', product.id);
      throw new AppError('Failed to save product images. Please try again.', 500);
    }
  }

  logger.info({ message: 'Product created', productId: product.id, sellerId: seller.id });

  // Fire-and-forget: adding a product may satisfy the active-products criterion
  updateVerificationStatus(seller.id);

  return getProductByIdForSeller(product.id);
};

const updateProduct = async (userId, productId, updates) => {
  const seller = await getSellerByUserId(userId);
  const existingProduct = await verifyProductOwnership(productId, seller.id);

  const allowed = [
    'name',
    'description',
    'price',
    'price_min',
    'price_max',
    'completion_days',
    'category_id',
    'is_active',
  ];

  const safeUpdates = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      safeUpdates[key] = updates[key];
    }
  }

  if (safeUpdates.category_id === '') {
    safeUpdates.category_id = null;
  }

  if (
    safeUpdates.price === undefined &&
    (safeUpdates.price_min !== undefined || safeUpdates.price_max !== undefined)
  ) {
    safeUpdates.price = resolveStoredPrice({
      price_min: safeUpdates.price_min ?? existingProduct.price_min,
      price_max: safeUpdates.price_max ?? existingProduct.price_max,
      existingPrice: existingProduct.price,
    });
  }

  const { error } = await supabaseAdmin
    .from('products')
    .update(safeUpdates)
    .eq('id', productId);

  if (error) {
    logger.error({
      message: 'Failed to update product',
      productId,
      error: error.message,
      code: error.code,
    });
    throw new AppError('Failed to update product', 500);
  }

  logger.info({ message: 'Product updated', productId, sellerId: seller.id });
  return getProductByIdForSeller(productId);
};

const deleteProduct = async (userId, productId) => {
  const seller = await getSellerByUserId(userId);
  await verifyProductOwnership(productId, seller.id);

  const { error } = await supabaseAdmin
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) {
    logger.error({ message: 'Failed to delete product', productId, error: error.message });
    throw new AppError('Failed to delete product', 500);
  }

  logger.info({ message: 'Product soft deleted', productId, sellerId: seller.id });

  // Fire-and-forget: removing a product may drop below the active-products threshold
  updateVerificationStatus(seller.id);
};

const getMyProducts = async (userId, query) => {
  const page = toPositiveInteger(query.page, 1);
  const limit = toPositiveInteger(query.limit, 20);
  const offset = (page - 1) * limit;

  const seller = await getSellerByUserId(userId);

  const { data: products, error, count } = await supabaseAdmin
    .from('products')
    .select(PRODUCT_BASE_COLUMNS, { count: 'exact' })
    .eq('seller_id', seller.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error({
      message: 'Failed to fetch seller products',
      sellerId: seller.id,
      error: error.message,
      code: error.code,
    });
    throw new AppError('Failed to fetch your products', 500);
  }

  return {
    products: await hydrateProducts(products || []),
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
  getProductsByIds,
};
