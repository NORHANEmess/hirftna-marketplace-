'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// REUSABLE FIELD SCHEMAS
// ─────────────────────────────────────────────────────────────

// HTTPS-only image URL — prevents XSS
const imageUrlField = z
  .string()
  .trim()
  .url({ error: 'Each image must be a valid URL' })
  .refine(
    (url) => url.startsWith('https://'),
    { message: 'Images must use HTTPS URLs only' }
  );

// Price field — Algerian Dinar, positive
const priceField = z
  .number({ error: 'Price must be a number' })
  .positive({ error: 'Price must be greater than 0' })
  .max(9999999, { error: 'Price cannot exceed 9,999,999 DA' })
  .multipleOf(0.01, { error: 'Price can have at most 2 decimal places' });

// ─────────────────────────────────────────────────────────────
// CREATE PRODUCT SCHEMA
// POST /api/v1/products
//
// FRONTEND MODEL (source of truth):
//   - price_min / price_max  (price range, both optional)
//   - price                  (base price, optional fallback)
//   - completion_days        (handmade delivery estimate)
//   - NO stock field         (custom order platform, not inventory)
//   - images                 (array of uploaded HTTPS URLs)
// ─────────────────────────────────────────────────────────────
const createProductSchema = z
  .object({
    name: z
      .string({ error: 'Product name is required' })
      .trim()
      .min(2,   { error: 'Name must be at least 2 characters'  })
      .max(200, { error: 'Name cannot exceed 200 characters'   }),

    description: z
      .string()
      .trim()
      .min(5,    { error: 'Description must be at least 5 characters' })
      .max(2000, { error: 'Description cannot exceed 2000 characters'  })
      .optional(),

    // ── Price Range ──────────────────────────────────────────
    // Hirftna is a custom-order platform — sellers set a range
    // price_min and price_max replace the old single `price` field
    price_min: priceField.optional(),
    price_max: priceField.optional(),

    // Legacy single price — accepted as fallback, stored for compatibility
    price: priceField.optional(),

    // ── Custom Order Specific ────────────────────────────────
    // How many days the artisan typically needs to complete this
    completion_days: z
      .number({ error: 'Completion days must be a number' })
      .int({ error: 'Completion days must be a whole number' })
      .min(1,   { error: 'Completion time must be at least 1 day'  })
      .max(365, { error: 'Completion time cannot exceed 365 days'  })
      .optional(),

    category_id: z
      .string({ error: 'Category is required' })
      .uuid({ error: 'Invalid category ID' }),

    is_active: z
      .boolean()
      .default(true),

    // ── Images ───────────────────────────────────────────────
    // Array of HTTPS URLs returned by /uploads/image
    // Frontend field is `images` (array of URL strings)
    images: z
      .array(imageUrlField)
      .max(5, { error: 'Cannot upload more than 5 images' })
      .optional(),
  })
  // Validate: price_min must be <= price_max when both provided
  .refine(
    (data) => {
      if (data.price_min !== undefined && data.price_max !== undefined) {
        return data.price_min <= data.price_max;
      }
      return true;
    },
    {
      message: 'Minimum price cannot exceed maximum price',
      path: ['price_min'],
    }
  )
  // Require at least one price indicator
  .refine(
    (data) => {
      return (
        data.price_min !== undefined ||
        data.price_max !== undefined ||
        data.price !== undefined
      );
    },
    {
      message: 'At least one of price, price_min, or price_max must be provided',
      path: ['price'],
    }
  );

// ─────────────────────────────────────────────────────────────
// UPDATE PRODUCT SCHEMA
// PUT /api/v1/products/:id
// All fields optional — at least one required
// ─────────────────────────────────────────────────────────────
const updateProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2,   { error: 'Name must be at least 2 characters'  })
      .max(200, { error: 'Name cannot exceed 200 characters'   })
      .optional(),

    description: z
      .string()
      .trim()
      .min(5,    { error: 'Description must be at least 5 characters' })
      .max(2000, { error: 'Description cannot exceed 2000 characters'  })
      .optional(),

    price_min: priceField.optional(),
    price_max: priceField.optional(),
    price:     priceField.optional(),

    completion_days: z
      .number()
      .int()
      .min(1,   { error: 'Completion time must be at least 1 day'  })
      .max(365, { error: 'Completion time cannot exceed 365 days'  })
      .optional(),

    category_id: z
      .string()
      .uuid({ error: 'Invalid category ID' })
      .optional(),

    is_active: z
      .boolean({ error: 'is_active must be true or false' })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).filter(k => data[k] !== undefined).length > 0,
    { message: 'At least one field must be provided to update' }
  )
  .refine(
    (data) => {
      if (data.price_min !== undefined && data.price_max !== undefined) {
        return data.price_min <= data.price_max;
      }
      return true;
    },
    {
      message: 'Minimum price cannot exceed maximum price',
      path: ['price_min'],
    }
  );

// ─────────────────────────────────────────────────────────────
// PRODUCT QUERY SCHEMA
// GET /api/v1/products?page=1&limit=20&search=...
//
// FIX: Added 'newest' → valid, removed 'oldest' → not in frontend UI
// FIX: Frontend sends sort=rating not sort=rating (confirmed same)
// FIX: Frontend sends ?q= as search param (map to search)
// ─────────────────────────────────────────────────────────────
const productQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .transform((val) => {
        const parsed = parseInt(val ?? '1', 10);
        return isNaN(parsed) ? 1 : parsed;
      })
      .pipe(z.number().int().min(1, { error: 'Page must be at least 1' })),

    limit: z
      .string()
      .optional()
      .transform((val) => {
        const parsed = parseInt(val ?? '20', 10);
        return isNaN(parsed) ? 20 : parsed;
      })
      .pipe(
        z.number().int()
          .min(1,   { error: 'Limit must be at least 1'  })
          .max(100, { error: 'Limit cannot exceed 100'   })
      ),

    offset: z
      .string()
      .optional()
      .transform((val) => {
        const parsed = parseInt(val ?? '0', 10);
        return isNaN(parsed) ? 0 : parsed;
      })
      .pipe(z.number().int().min(0).optional()),

    category_id: z
      .string()
      .uuid({ error: 'Invalid category ID' })
      .optional(),

    // Frontend BrowsePage sends ?category=slug (not uuid)
    // Accept both category_id (uuid) and category (slug)
    category: z
      .string()
      .trim()
      .max(100)
      .optional(),

    // Search — frontend sends as ?q= or ?search=
    // Accept both param names
    search: z
      .string()
      .trim()
      .max(100, { error: 'Search query too long' })
      .optional(),

    q: z
      .string()
      .trim()
      .max(100, { error: 'Search query too long' })
      .optional(),

    // FIX: 'bestseller' REMOVED — backend doesn't support it
    // Frontend already fixed to only send: newest, price_asc, price_desc, rating
    sort: z
      .enum(['newest', 'price_asc', 'price_desc', 'rating'])
      .default('newest'),

    // Price range filters — frontend uses min/max (not min_price/max_price)
    min: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined)
      .pipe(z.number().positive().optional()),

    max: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined)
      .pipe(z.number().positive().optional()),

    // Legacy — still accept min_price / max_price if sent
    min_price: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined)
      .pipe(z.number().positive().optional()),

    max_price: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined)
      .pipe(z.number().positive().optional()),

    seller_id: z
      .string()
      .uuid({ error: 'Invalid seller ID' })
      .optional(),
  })
  .refine(
    (data) => {
      const min = data.min ?? data.min_price;
      const max = data.max ?? data.max_price;
      if (min !== undefined && max !== undefined) {
        return min <= max;
      }
      return true;
    },
    {
      message: 'Minimum price cannot be greater than maximum price',
      path: ['min'],
    }
  );

module.exports = {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
};