'use strict';

const { Router }          = require('express');
const categoryController  = require('../controllers/category.controller');
const { authenticate }    = require('../middlewares/auth.middleware');
const { requireRole }     = require('../middlewares/role.middleware');
const { validate, validateId } = require('../middlewares/validate.middleware');
const {
  createCategorySchema,
  updateCategorySchema,
  slugParamSchema,
} = require('../validators/category.validator');

const router = Router();

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// No authentication required
// ─────────────────────────────────────────────────────────────

// GET /api/v1/categories
// Returns all categories
router.get(
  '/',
  categoryController.getAllCategories
);

// GET /api/v1/categories/slug/:slug
// Must be BEFORE /:id route
// Otherwise "slug" is treated as an ID
router.get(
  '/slug/:slug',
  validate({ params: slugParamSchema }),
  categoryController.getCategoryBySlug
);

// GET /api/v1/categories/:id
router.get(
  '/:id',
  validateId(),
  categoryController.getCategoryById
);

// ─────────────────────────────────────────────────────────────
// ADMIN ONLY ROUTES
// Requires authentication + admin role
// ─────────────────────────────────────────────────────────────

// POST /api/v1/categories
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  validate({ body: createCategorySchema }),
  categoryController.createCategory
);

// PUT /api/v1/categories/:id
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateId(),
  validate({ body: updateCategorySchema }),
  categoryController.updateCategory
);

// DELETE /api/v1/categories/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  validateId(),
  categoryController.deleteCategory
);

module.exports = router;