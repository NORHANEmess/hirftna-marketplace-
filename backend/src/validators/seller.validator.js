'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// REUSABLE FIELD SCHEMAS
// FIX — Extract reusable fields (DRY consistency
//        with product.validator.js pattern)
// ─────────────────────────────────────────────────────────────

// Reusable HTTPS URL field for avatars
// Mirrors imageUrlField in product.validator.js
const avatarUrlField = z
  .string()
  .trim()
  .url({ error: 'Avatar must be a valid URL' })
  .refine(
    (url) => url.startsWith('https://'),
    { message: 'Avatar URL must use HTTPS only' }
  );

// ─────────────────────────────────────────────────────────────
// CREATE SELLER SCHEMA
// POST /api/v1/sellers
// ─────────────────────────────────────────────────────────────
const createSellerSchema = z.object({
  shop_name: z
    .string({ error: 'Shop name is required' })
    .trim()
    .min(2,   { error: 'Shop name must be at least 2 characters'  })
    .max(100, { error: 'Shop name cannot exceed 100 characters'   }),

  description: z
    .string()
    .trim()
    .max(1000, { error: 'Description cannot exceed 1000 characters' })
    .optional(),

  // Seller story — supports Markdown
  // Max 5000 chars to allow rich content
  story: z
    .string()
    .trim()
    .max(5000, { error: 'Story cannot exceed 5000 characters' })
    .optional(),

  location: z
    .string()
    .trim()
    .max(200, { error: 'Location cannot exceed 200 characters' })
    .optional(),

  category_id: z
    .string({ error: 'Category is required' })
    .uuid({ error: 'Invalid category ID' }),

  // FIX — use reusable avatarUrlField
  avatar_url: avatarUrlField.optional(),
});

// ─────────────────────────────────────────────────────────────
// UPDATE SELLER SCHEMA
// PUT /api/v1/sellers/:id
// All fields optional — at least one required
// ─────────────────────────────────────────────────────────────
const updateSellerSchema = z
  .object({
    shop_name: z
      .string()
      .trim()
      .min(2,   { error: 'Shop name must be at least 2 characters' })
      .max(100, { error: 'Shop name cannot exceed 100 characters'  })
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, { error: 'Description cannot exceed 1000 characters' })
      .optional(),

    story: z
      .string()
      .trim()
      .max(5000, { error: 'Story cannot exceed 5000 characters' })
      .optional(),

    location: z
      .string()
      .trim()
      .max(200, { error: 'Location cannot exceed 200 characters' })
      .optional(),

    category_id: z
      .string()
      .uuid({ error: 'Invalid category ID' })
      .optional(),

    // FIX — use reusable avatarUrlField
    avatar_url: avatarUrlField.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided to update' }
  );

// ─────────────────────────────────────────────────────────────
// SELLER QUERY SCHEMA
// GET /api/v1/sellers?page=1&limit=20&category=uuid&search=...
//
// NOTE — Sort options differ from product.validator.js:
// Sellers:  ['newest', 'oldest', 'rating']
// Products: ['newest', 'oldest', 'price_asc', 'price_desc', 'rating']
// Sellers don't have prices so price sorting is not applicable
// ─────────────────────────────────────────────────────────────
const sellerQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val ?? '1', 10);
      return isNaN(parsed) ? 1 : parsed;
    })
    .pipe(
      z.number()
       .int()
       .min(1, { error: 'Page must be at least 1' })
    ),

  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val ?? '20', 10);
      return isNaN(parsed) ? 20 : parsed;
    })
    .pipe(
      z.number()
       .int()
       .min(1,   { error: 'Limit must be at least 1'  })
       .max(100, { error: 'Limit cannot exceed 100'   })
    ),

  category_id: z
    .string()
    .uuid({ error: 'Invalid category ID' })
    .optional(),

  // Supports Arabic (\u0600-\u06FF) and French characters
  // Identical regex to product.validator.js for consistency
  search: z
    .string()
    .trim()
    .max(100, { error: 'Search query too long' })
    .regex(
      /^[a-zA-Z0-9\u0600-\u06FF\s\-_'".,!?()]+$/,
      { error: 'Search query contains invalid characters' }
    )
    .optional(),

  // Sellers sorted by newest/oldest/rating only
  // No price sorting (sellers don't have prices)
  sort: z
    .enum(['newest', 'oldest', 'rating'])
    .default('newest'),
});

module.exports = {
  createSellerSchema,
  updateSellerSchema,
  sellerQuerySchema,
  avatarUrlField, // Export for reuse in other validators
};