'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// ADD TO WISHLIST SCHEMA
// POST /api/v1/wishlist
// ─────────────────────────────────────────────────────────────
const addToWishlistSchema = z.object({
  product_id: z
    .string({ error: 'Product ID is required' })
    .uuid({ error: 'Invalid product ID' }),
});

module.exports = {
  addToWishlistSchema,
};
