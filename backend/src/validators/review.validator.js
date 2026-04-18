'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// CREATE REVIEW SCHEMA
// POST /api/v1/reviews
// ─────────────────────────────────────────────────────────────
const createReviewSchema = z.object({
  product_id: z
    .string({ error: 'Product ID is required' })
    .uuid({ error: 'Invalid product ID' }),

  rating: z
    .number({ error: 'Rating must be a number' })
    .int({ error: 'Rating must be a whole number' })
    .min(1, { error: 'Rating must be at least 1' })
    .max(5, { error: 'Rating cannot exceed 5'    }),

  comment: z
    .string()
    .trim()
    .max(1000, { error: 'Comment cannot exceed 1000 characters' })
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// CREATE SELLER RATING SCHEMA
// POST /api/v1/reviews/seller
// ─────────────────────────────────────────────────────────────
const createSellerRatingSchema = z.object({
  seller_id: z
    .string({ error: 'Seller ID is required' })
    .uuid({ error: 'Invalid seller ID' }),

  rating: z
    .number({ error: 'Rating must be a number' })
    .int({ error: 'Rating must be a whole number' })
    .min(1, { error: 'Rating must be at least 1' })
    .max(5, { error: 'Rating cannot exceed 5'    }),
});

// ─────────────────────────────────────────────────────────────
// REVIEW QUERY SCHEMA
// GET /api/v1/reviews?product_id=uuid&page=1
// ─────────────────────────────────────────────────────────────
const reviewQuerySchema = z.object({
  product_id: z
    .string()
    .uuid({ error: 'Invalid product ID' })
    .optional(),

  seller_id: z
    .string()
    .uuid({ error: 'Invalid seller ID' })
    .optional(),

  page: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val ?? '1', 10);
      return isNaN(parsed) ? 1 : parsed;
    })
    .pipe(
      z.number().int().min(1, { error: 'Page must be at least 1' })
    ),

  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val ?? '10', 10);
      return isNaN(parsed) ? 10 : parsed;
    })
    .pipe(
      z.number().int()
       .min(1,  { error: 'Limit must be at least 1'  })
       .max(50, { error: 'Limit cannot exceed 50'    })
    ),
});

module.exports = {
  createReviewSchema,
  createSellerRatingSchema,
  reviewQuerySchema,
};