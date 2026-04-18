'use strict';

const { Router }               = require('express');
const productController        = require('../controllers/product.controller');
const { authenticate,
        optionalAuthenticate } = require('../middlewares/auth.middleware');
const { requireRole }          = require('../middlewares/role.middleware');
const { validate,
        validateId,
        validatePagination }   = require('../middlewares/validate.middleware');
const {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} = require('../validators/product.validator');

const router = Router();

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// No authentication required
// optionalAuthenticate → sets req.user if token provided
// ─────────────────────────────────────────────────────────────

// GET /api/v1/products
// Browse all products with filters and pagination
router.get(
  '/',
  validate({ query: productQuerySchema }),
  productController.getAllProducts
);

// ─────────────────────────────────────────────────────────────
// SELLER ONLY ROUTES
// Must be BEFORE /:id to avoid conflicts
// ─────────────────────────────────────────────────────────────

// GET /api/v1/products/my-products
// Must be BEFORE /:id — otherwise "my-products" is treated as ID
router.get(
  '/my-products',
  authenticate,
  requireRole('seller'),
  validatePagination(),
  productController.getMyProducts
);

// POST /api/v1/products
// Create a new product
router.post(
  '/',
  authenticate,
  requireRole('seller'),
  validate({ body: createProductSchema }),
  productController.createProduct
);

// PUT /api/v1/products/:id
// Update a product (owner only — checked in service)
router.put(
  '/:id',
  authenticate,
  requireRole('seller'),
  validateId(),
  validate({ body: updateProductSchema }),
  productController.updateProduct
);

// DELETE /api/v1/products/:id
// Soft delete a product (owner only — checked in service)
router.delete(
  '/:id',
  authenticate,
  requireRole('seller'),
  validateId(),
  productController.deleteProduct
);

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES WITH OPTIONAL AUTH
// These must be AFTER specific routes like /my-products
// ─────────────────────────────────────────────────────────────

// GET /api/v1/products/:id
// View product detail — tracks browsing if logged in
router.get(
  '/:id',
  optionalAuthenticate,
  validateId(),
  productController.getProductById
);

module.exports = router;