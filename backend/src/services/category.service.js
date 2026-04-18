'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

// Supabase returns PGRST116 when .single() finds no rows
const isNotFound = (error) =>
  error?.code === 'PGRST116' || error?.code === '406';

// Standard columns to select — never SELECT *
const CATEGORY_COLUMNS = 'id, name, slug, icon_url, created_at';

// ─────────────────────────────────────────────────────────────
// GET ALL CATEGORIES
// Public — no authentication required
// ─────────────────────────────────────────────────────────────
const getAllCategories = async () => {
  const { data: categories, error } = await supabaseAdmin
    .from('categories')
    .select(CATEGORY_COLUMNS)
    .order('name', { ascending: true });

  if (error) {
    logger.error({
      message: 'Failed to fetch categories',
      error:   error.message,
      code:    error.code,
    });
    throw new AppError('Failed to fetch categories', 500);
  }

  // Always return array — never null
  return categories || [];
};

// ─────────────────────────────────────────────────────────────
// GET CATEGORY BY ID
// Public — no authentication required
// ─────────────────────────────────────────────────────────────
const getCategoryById = async (id) => {
  // FIX — validate id is provided
  if (!id) throw new AppError('Category ID is required', 400);

  const { data: category, error } = await supabaseAdmin
    .from('categories')
    .select(CATEGORY_COLUMNS)
    .eq('id', id)
    .single();

  // FIX — distinguish between not found and other errors
  if (error) {
    if (isNotFound(error)) {
      throw new AppError('Category not found', 404);
    }
    logger.error({
      message: 'Failed to fetch category',
      id,
      error:   error.message,
      code:    error.code,
    });
    throw new AppError('Failed to fetch category', 500);
  }

  return category;
};

// ─────────────────────────────────────────────────────────────
// GET CATEGORY BY SLUG
// Public — used for URL-friendly category pages
// ─────────────────────────────────────────────────────────────
const getCategoryBySlug = async (slug) => {
  // FIX — validate slug is provided
  if (!slug) throw new AppError('Category slug is required', 400);

  const { data: category, error } = await supabaseAdmin
    .from('categories')
    .select(CATEGORY_COLUMNS)
    .eq('slug', slug)
    .single();

  // FIX — distinguish between not found and other errors
  if (error) {
    if (isNotFound(error)) {
      throw new AppError('Category not found', 404);
    }
    logger.error({
      message: 'Failed to fetch category by slug',
      slug,
      error:   error.message,
      code:    error.code,
    });
    throw new AppError('Failed to fetch category', 500);
  }

  return category;
};

// ─────────────────────────────────────────────────────────────
// CREATE CATEGORY
// Admin only
//
// FIX — Removed manual duplicate checks (race condition)
// DB unique constraints handle duplicates reliably
// We just handle the 23505 error code
// ─────────────────────────────────────────────────────────────
const createCategory = async ({ name, slug, icon_url }) => {
  // FIX — validate required fields
  if (!name || !name.trim()) {
    throw new AppError('Category name is required', 400);
  }
  if (!slug || !slug.trim()) {
    throw new AppError('Category slug is required', 400);
  }

  const { data: category, error } = await supabaseAdmin
    .from('categories')
    .insert({
      name:     name.trim(),
      slug:     slug.trim().toLowerCase(),
      icon_url: icon_url?.trim() || null,
    })
    .select(CATEGORY_COLUMNS)
    .single();

  if (error) {
    // FIX — handle unique constraint violation from DB
    // This is more reliable than manual pre-checks
    if (error.code === '23505') {
      // Determine which field caused the conflict
      const field = error.message.includes('slug') ? 'slug' : 'name';
      throw new AppError(
        `A category with this ${field} already exists`,
        409
      );
    }

    logger.error({
      message: 'Failed to create category',
      error:   error.message,
      code:    error.code,
    });
    throw new AppError('Failed to create category', 500);
  }

  logger.info({
    message:    'Category created',
    categoryId: category.id,
    name:       category.name,
  });

  return category;
};

// ─────────────────────────────────────────────────────────────
// UPDATE CATEGORY
// Admin only
// ─────────────────────────────────────────────────────────────
const updateCategory = async (id, updates) => {
  // FIX — validate id
  if (!id) throw new AppError('Category ID is required', 400);

  // FIX — validate updates object
  if (!updates || Object.keys(updates).length === 0) {
    throw new AppError('No update fields provided', 400);
  }

  // Verify category exists first
  await getCategoryById(id);

  // Sanitize update fields
  const sanitized = {};
  if (updates.name     !== undefined) sanitized.name     = updates.name.trim();
  if (updates.slug     !== undefined) sanitized.slug     = updates.slug.trim().toLowerCase();
  if (updates.icon_url !== undefined) sanitized.icon_url = updates.icon_url?.trim() || null;

  const { data: updatedCategory, error } = await supabaseAdmin
    .from('categories')
    .update(sanitized)
    .eq('id', id)
    .select(CATEGORY_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      const field = error.message.includes('slug') ? 'slug' : 'name';
      throw new AppError(
        `A category with this ${field} already exists`,
        409
      );
    }

    logger.error({
      message:    'Failed to update category',
      categoryId: id,
      error:      error.message,
      code:       error.code,
    });
    throw new AppError('Failed to update category', 500);
  }

  logger.info({
    message:    'Category updated',
    categoryId: id,
  });

  return updatedCategory;
};

// ─────────────────────────────────────────────────────────────
// DELETE CATEGORY
// Admin only
// Checks if category has products before deleting
// ─────────────────────────────────────────────────────────────
const deleteCategory = async (id) => {
  // FIX — validate id
  if (!id) throw new AppError('Category ID is required', 400);

  // Verify category exists first
  await getCategoryById(id);

  // FIX — handle countError properly
  // If count check fails → block deletion (safer than proceeding)
  const { count, error: countError } = await supabaseAdmin
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countError) {
    logger.error({
      message:    'Failed to check category products count',
      categoryId: id,
      error:      countError.message,
    });
    // FIX — block deletion if we can't verify product count
    // Safer than allowing potentially orphaned products
    throw new AppError(
      'Cannot verify category products. Please try again.',
      500
    );
  }

  // FIX — count is guaranteed to be a number here (no countError)
  if (count > 0) {
    throw new AppError(
      `Cannot delete category — it has ${count} product${count === 1 ? '' : 's'}. ` +
      'Move or delete the products first.',
      409
    );
  }

  const { error } = await supabaseAdmin
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error({
      message:    'Failed to delete category',
      categoryId: id,
      error:      error.message,
      code:       error.code,
    });
    throw new AppError('Failed to delete category', 500);
  }

  logger.info({
    message:    'Category deleted',
    categoryId: id,
  });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
