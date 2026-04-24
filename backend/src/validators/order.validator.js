'use strict';

const { z } = require('zod');
const {
  createOrderSchemas,
  normalizeCreateOrderPayload,
} = require('../../../shared/schemas/order.schema');

const {
  createOrderSchema: baseCreateOrderSchema,
  quantityField,
} = createOrderSchemas(z);

const createOrderSchema = z.preprocess(
  normalizeCreateOrderPayload,
  baseCreateOrderSchema
);

const updateOrderStatusSchema = z
  .object({
    status: z.enum(
      ['accepted', 'rejected'],
      { error: 'Status must be either accepted or rejected' }
    ),

    rejection_reason: z
      .string()
      .trim()
      .max(500, { error: 'Rejection reason cannot exceed 500 characters' })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'rejected') {
        return (
          data.rejection_reason !== undefined &&
          data.rejection_reason.trim().length > 0
        );
      }
      return true;
    },
    {
      message: 'Rejection reason is required when rejecting an order',
      path: ['rejection_reason'],
    }
  );

const orderQuerySchema = z.object({
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
      const parsed = parseInt(val ?? '20', 10);
      return isNaN(parsed) ? 20 : parsed;
    })
    .pipe(
      z.number().int()
        .min(1, { error: 'Limit must be at least 1' })
        .max(100, { error: 'Limit cannot exceed 100' })
    ),

  status: z
    .enum(['pending', 'accepted', 'rejected', 'completed'])
    .optional(),

  as: z
    .enum(['client', 'seller'])
    .optional(),
});

module.exports = {
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  quantityField,
};
