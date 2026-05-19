'use strict';

const { z } = require('zod');

// Seller rates a client after order completion
const createClientRatingSchema = z.object({
  order_id: z
    .string({ error: 'Order ID is required' })
    .uuid({ error: 'Invalid order ID' }),

  rating: z
    .number({ error: 'Rating must be a number' })
    .int({ error: 'Rating must be a whole number' })
    .min(1, { error: 'Rating must be at least 1' })
    .max(5, { error: 'Rating cannot exceed 5' }),

  comment: z
    .string()
    .trim()
    .max(500, { error: 'Comment cannot exceed 500 characters' })
    .optional(),
});

module.exports = { createClientRatingSchema };
