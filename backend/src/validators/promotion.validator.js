'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// REQUEST PROMOTION SCHEMA
// POST /api/v1/promotions/request
// Seller submits a promotion request for their shop
// ─────────────────────────────────────────────────────────────
const requestPromotionSchema = z.object({
  placement: z
    .enum(['hero', 'browse', 'featured', 'category_top'], {
      error: 'placement must be hero, browse, featured, or category_top',
    })
    .default('hero'),

  product_id: z.string().uuid({ error: 'product_id must be a valid UUID' }).optional().nullable(),

  requested_days: z
    .number({ error: 'requested_days must be a number' })
    .int({ error: 'requested_days must be a whole number' })
    .min(7,  { error: 'Minimum promotion duration is 7 days'  })
    .max(90, { error: 'Maximum promotion duration is 90 days' })
    .default(7),
}).refine(
  (data) => {
    const isProductLevel = data.placement === 'featured' || data.placement === 'category_top';
    return !isProductLevel || Boolean(data.product_id);
  },
  { message: 'product_id is required for featured and category_top placements', path: ['product_id'] }
);

// ─────────────────────────────────────────────────────────────
// ADMIN PROMOTIONS QUERY SCHEMA
// GET /api/v1/admin/promotions
// ─────────────────────────────────────────────────────────────
const adminPromotionQuerySchema = z.object({
  status: z
    .enum(['pending', 'active', 'expired', 'rejected'])
    .optional(),

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
       .min(1,  { error: 'Limit must be at least 1'  })
       .max(100, { error: 'Limit cannot exceed 100'  })
    ),
});

// ─────────────────────────────────────────────────────────────
// ADMIN REJECT SCHEMA
// PATCH /api/v1/admin/promotions/:id/reject
// ─────────────────────────────────────────────────────────────
const rejectPromotionSchema = z.object({
  rejection_reason: z
    .string({ error: 'rejection_reason is required' })
    .trim()
    .min(1,   { error: 'rejection_reason cannot be empty' })
    .max(500, { error: 'rejection_reason cannot exceed 500 characters' }),
});

module.exports = {
  requestPromotionSchema,
  adminPromotionQuerySchema,
  rejectPromotionSchema,
};
