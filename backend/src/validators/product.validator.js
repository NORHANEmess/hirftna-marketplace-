'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// REUSABLE FIELD SCHEMAS
// FIX 3 — Extract reusable fields to avoid duplication
// ─────────────────────────────────────────────────────────────
const priceField = z
  .number({ error: 'Price must be a number' })
  .positive({ error: 'Price must be greater than 0' })
  .max(999999.99, { error: 'Price cannot exceed 999,999.99' })
  .multipleOf(0.01, { error: 'Price can have at most 2 decimal places' });

const stockField = z
  .number({ error: 'Stock must be a number' })
  .int({ error: 'Stock must be a whole number' })
  .min(0,     { error: 'Stock cannot be negative'    })
  .max(99999, { error: 'Stock cannot exceed 99,999'  });

// FIX 1 — HTTPS only image URL validation
// Prevents XSS via javascript: or data: URLs
const imageUrlField = z
  .string()
  .trim()
  .url({ error: 'Each image must be a valid URL' })
  .refine(
    (url) => url.startsWith('https://'),
    { message: 'Images must use HTTPS URLs only' }
  );

// ─────────────────────────────────────────────────────────────
// CREATE PRODUCT SCHEMA
// POST /api/v1/products
// ─────────────────────────────────────────────────────────────
const createProductSchema = z.object({
  name: z
    .string({ error: 'Product name is required' })
    .trim()
    .min(2,   { error: 'Name must be at least 2 characters'  })
    .max(200, { error: 'Name cannot exceed 200 characters'   }),

  description: z
    .string({ error: 'Description is required' })
    .trim()
    .min(10,   { error: 'Description must be at least 10 characters' })
    .max(2000, { error: 'Description cannot exceed 2000 characters'  }),

  // FIX 3 — use reusable priceField
  price: priceField,

  // FIX 3 — use reusable stockField
  stock: stockField.default(0),

  category_id: z
    .string({ error: 'Category is required' })
    .uuid({ error: 'Invalid category ID' }),

  // FIX 4 — add is_active to create schema
  is_active: z
    .boolean()
    .default(true),

  // FIX 1 — HTTPS only images
  images: z
    .array(imageUrlField)
    .max(5, { error: 'Cannot upload more than 5 images' })
    .optional(),
});

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
      .min(10,   { error: 'Description must be at least 10 characters' })
      .max(2000, { error: 'Description cannot exceed 2000 characters'  })
      .optional(),

    // FIX 3 — use reusable priceField
    price: priceField.optional(),

    // FIX 3 — use reusable stockField
    stock: stockField.optional(),

    category_id: z
      .string()
      .uuid({ error: 'Invalid category ID' })
      .optional(),

    is_active: z
      .boolean({ error: 'is_active must be true or false' })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided to update' }
  );

// ─────────────────────────────────────────────────────────────
// PRODUCT QUERY SCHEMA
// GET /api/v1/products?page=1&limit=20&search=...
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

    // FIX 2 — Sanitize search query
    // Only allow safe characters — prevents injection
    search: z
      .string()
      .trim()
      .max(100, { error: 'Search query too long' })
      .regex(
        /^[a-zA-Z0-9\u0600-\u06FF\s\-_'".,!?()]+$/,
        { error: 'Search query contains invalid characters' }
      )
      .optional(),

    sort: z
      .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'rating'])
      .default('newest'),

    min_price: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined)
      .pipe(
        z.number()
         .positive({ error: 'Min price must be positive' })
         .optional()
      ),

    max_price: z
      .string()
      .optional()
      .transform((val) => val ? parseFloat(val) : undefined)
      .pipe(
        z.number()
         .positive({ error: 'Max price must be positive' })
         .optional()
      ),
  })
  // FIX 2 — Validate min_price <= max_price
  .refine(
    (data) => {
      if (data.min_price !== undefined && data.max_price !== undefined) {
        return data.min_price <= data.max_price;
      }
      return true;
    },
    {
      message: 'Minimum price cannot be greater than maximum price',
      path:    ['min_price'],
    }
  );

module.exports = {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
};
