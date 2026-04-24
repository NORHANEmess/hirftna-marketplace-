'use strict';

const categoryService  = require('../services/category.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess }  = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// GET ALL CATEGORIES
// GET /api/v1/categories
// Public — no authentication required
// Returns all categories sorted alphabetically
// ─────────────────────────────────────────────────────────────
const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();

  return sendSuccess(
    res,
    { categories },
    'Categories fetched successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// GET CATEGORY BY ID
// GET /api/v1/categories/:id
// Public — no authentication required
// req.params.id → validated as UUID by validateId() in routes
// ─────────────────────────────────────────────────────────────
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(
    req.params.id
  );

  return sendSuccess(
    res,
    { category },
    'Category fetched successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// GET CATEGORY BY SLUG
// GET /api/v1/categories/slug/:slug
// Public — no authentication required
// req.params.slug → validated in routes
// ─────────────────────────────────────────────────────────────
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(
    req.params.slug
  );

  return sendSuccess(
    res,
    { category },
    'Category fetched successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// CREATE CATEGORY
// POST /api/v1/categories
// Admin only — requires authenticate + requireRole('admin')
// req.body → validated by categorySchema in routes
// ─────────────────────────────────────────────────────────────
const createCategory = asyncHandler(async (req, res) => {
  // Explicitly extract only allowed fields
  // Zod already stripped unknown fields — this is extra safety
  const { name, slug, icon_url } = req.body;

  const category = await categoryService.createCategory({
    name,
    slug,
    icon_url,
  });

  return sendSuccess(
    res,
    { category },
    'Category created successfully',
    201
  );
});

// ─────────────────────────────────────────────────────────────
// UPDATE CATEGORY
// PUT /api/v1/categories/:id
// Admin only — requires authenticate + requireRole('admin')
// req.params.id → validated as UUID in routes
// req.body → validated by updateCategorySchema in routes
// ─────────────────────────────────────────────────────────────
const updateCategory = asyncHandler(async (req, res) => {
  // Explicitly extract only allowed fields
  const { name, slug, icon_url } = req.body;

  // Build updates with only provided fields
  // Prevents accidental overwrites with undefined values
  const updates = {};
  if (name     !== undefined) updates.name     = name;
  if (slug     !== undefined) updates.slug     = slug;
  if (icon_url !== undefined) updates.icon_url = icon_url;

  const category = await categoryService.updateCategory(
    req.params.id,
    updates
  );

  return sendSuccess(
    res,
    { category },
    'Category updated successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// DELETE CATEGORY
// DELETE /api/v1/categories/:id
// Admin only — requires authenticate + requireRole('admin')
// req.params.id → validated as UUID in routes
// ─────────────────────────────────────────────────────────────
const deleteCategory = asyncHandler(async (req, res) => {
  // Service handles: existence check + product count check
  await categoryService.deleteCategory(req.params.id);

  return sendSuccess(
    res,
    null,
    'Category deleted successfully',
    200
  );
});

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
