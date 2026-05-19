'use strict';

const productService             = require('../services/product.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendCollection } = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// GET ALL PRODUCTS
// GET /api/v1/products
// Public — visitors and clients can browse
// ─────────────────────────────────────────────────────────────
const getAllProducts = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }

  const result = await productService.getAllProducts(req.validated.query);

  return sendCollection(
    res,
    result.products,
    result.pagination,
    'Products fetched successfully',
    ['products']
  );
});

// ─────────────────────────────────────────────────────────────
// GET PRODUCT BY ID
// GET /api/v1/products/:id
// Public + optional auth
// ─────────────────────────────────────────────────────────────
const getProductById = asyncHandler(async (req, res) => {
  const user = req.user || null;

  const product = await productService.getProductById(req.params.id, user);

  return sendSuccess(res, { product }, 'Product fetched successfully', 200);
});

// ─────────────────────────────────────────────────────────────
// CREATE PRODUCT
// POST /api/v1/products
// Seller only
//
// FIX: Extract price_min, price_max, completion_days
// These replace the old single 'price' + 'stock' model
// ─────────────────────────────────────────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const {
    name,
    description,
    price,            // optional — legacy/base price
    price_min,        // FIX: new price range field
    price_max,        // FIX: new price range field
    completion_days,  // FIX: new custom-order field
    category_id,
    is_active,
    images,
  } = req.validated.body;

  const product = await productService.createProduct(req.user.id, {
    name,
    description,
    price,
    price_min,
    price_max,
    completion_days,
    category_id,
    is_active,
    images,
  });

  return sendSuccess(res, { product }, 'Product created successfully', 201);
});

// ─────────────────────────────────────────────────────────────
// UPDATE PRODUCT
// PUT /api/v1/products/:id
// Seller only — must own the product
//
// FIX: Extract price_min, price_max, completion_days
// ─────────────────────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const {
    name,
    description,
    price,
    price_min,        // FIX
    price_max,        // FIX
    completion_days,  // FIX
    category_id,
    is_active,
  } = req.validated.body;

  const updates = {};
  if (name        !== undefined) updates.name        = name;
  if (description !== undefined) updates.description = description;
  if (price       !== undefined) updates.price       = price;
  if (price_min   !== undefined) updates.price_min   = price_min;    // FIX
  if (price_max   !== undefined) updates.price_max   = price_max;    // FIX
  if (completion_days !== undefined) updates.completion_days = completion_days; // FIX
  if (category_id !== undefined) updates.category_id = category_id;
  if (is_active   !== undefined) updates.is_active   = is_active;

  const product = await productService.updateProduct(
    req.user.id,
    req.params.id,
    updates
  );

  return sendSuccess(res, { product }, 'Product updated successfully', 200);
});

// ─────────────────────────────────────────────────────────────
// DELETE PRODUCT
// DELETE /api/v1/products/:id
// Seller only — soft delete
// ─────────────────────────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(req.user.id, req.params.id);

  return sendSuccess(res, null, 'Product deleted successfully', 200);
});

// ─────────────────────────────────────────────────────────────
// GET MY PRODUCTS
// GET /api/v1/products/my-products
// Seller only
// ─────────────────────────────────────────────────────────────
const getMyProducts = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }

  const result = await productService.getMyProducts(req.user.id, req.validated.query);

  return sendCollection(
    res,
    result.products,
    result.pagination,
    'Your products fetched successfully',
    ['products']
  );
});

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
};
