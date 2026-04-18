'use strict';

const productService   = require('../services/product.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendPaginated } = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// IMPORTANT — Validation Pattern
//
// ALL controllers use req.validated for validated data:
//   req.validated.body   → validated request body
//   req.validated.params → validated URL params
//   req.validated.query  → validated query string
//
// NEVER use req.body/req.params/req.query directly
// req.validated.query is mandatory because Express 5
// makes req.query a getter-only property
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// GET ALL PRODUCTS
// GET /api/v1/products
// Public — visitors and clients can browse
// ─────────────────────────────────────────────────────────────
const getAllProducts = asyncHandler(async (req, res) => {
  // FIX — use req.validated.query ONLY
  // Never fall back to unvalidated req.query
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }

  const result = await productService.getAllProducts(
    req.validated.query
  );

  return sendPaginated(
    res,
    result.products,
    result.pagination,
    'Products fetched successfully'
  );
});

// ─────────────────────────────────────────────────────────────
// GET PRODUCT BY ID
// GET /api/v1/products/:id
// Public + optional auth
// ─────────────────────────────────────────────────────────────
const getProductById = asyncHandler(async (req, res) => {
  const userId = req.user?.id || null;

  // req.params.id already validated by validateId() in routes
  const product = await productService.getProductById(
    req.params.id,
    userId
  );

  return sendSuccess(
    res,
    { product },
    'Product fetched successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// CREATE PRODUCT
// POST /api/v1/products
// Seller only
// ─────────────────────────────────────────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  // FIX — use req.validated.body
  // Zod already stripped unknown fields
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const {
    name,
    description,
    price,
    stock,
    category_id,
    is_active,
    images,
  } = req.validated.body;

  const product = await productService.createProduct(
    req.user.id,
    { name, description, price, stock, category_id, is_active, images }
  );

  return sendSuccess(
    res,
    { product },
    'Product created successfully',
    201
  );
});

// ─────────────────────────────────────────────────────────────
// UPDATE PRODUCT
// PUT /api/v1/products/:id
// Seller only — must own the product
// ─────────────────────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  // FIX — use req.validated.body
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const {
    name,
    description,
    price,
    stock,
    category_id,
    is_active,
  } = req.validated.body;

  // Build updates with only provided fields
  const updates = {};
  if (name        !== undefined) updates.name        = name;
  if (description !== undefined) updates.description = description;
  if (price       !== undefined) updates.price       = price;
  if (stock       !== undefined) updates.stock       = stock;
  if (category_id !== undefined) updates.category_id = category_id;
  if (is_active   !== undefined) updates.is_active   = is_active;

  const product = await productService.updateProduct(
    req.user.id,
    req.params.id,
    updates
  );

  return sendSuccess(
    res,
    { product },
    'Product updated successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// DELETE PRODUCT
// DELETE /api/v1/products/:id
// Seller only — soft delete
// ─────────────────────────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  await productService.deleteProduct(
    req.user.id,
    req.params.id
  );

  return sendSuccess(
    res,
    null,
    'Product deleted successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// GET MY PRODUCTS
// GET /api/v1/products/my-products
// Seller only
// ─────────────────────────────────────────────────────────────
const getMyProducts = asyncHandler(async (req, res) => {
  // FIX — use req.validated.query ONLY
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }

  const result = await productService.getMyProducts(
    req.user.id,
    req.validated.query
  );

  return sendPaginated(
    res,
    result.products,
    result.pagination,
    'Your products fetched successfully'
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