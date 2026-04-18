'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// REUSABLE FIELD SCHEMAS
// ─────────────────────────────────────────────────────────────
const quantityField = z
  .number({ error: 'Quantity must be a number' })
  .int({ error: 'Quantity must be a whole number' })
  .min(1, { error: 'Quantity must be at least 1' })
  .max(100, { error: 'Quantity cannot exceed 100' });

// ─────────────────────────────────────────────────────────────
// ORDER ITEM SCHEMA
// ─────────────────────────────────────────────────────────────
const orderItemSchema = z.object({
  product_id: z
    .string({ error: 'Product ID is required' })
    .uuid({ error: 'Invalid product ID' }),

  quantity: quantityField,
});

// ─────────────────────────────────────────────────────────────
// CREATE ORDER SCHEMA
// POST /api/v1/orders
//
// This platform uses CUSTOM ORDERS — not traditional e-commerce.
// Products are custom-made, prices are ranges.
// Client sends a request → seller reviews → seller sends offer.
//
// seller_id NOT in body — determined from products by service layer
// ─────────────────────────────────────────────────────────────
const createOrderSchema = z
  .object({
    items: z
      .array(orderItemSchema, { error: 'Items must be an array' })
      .min(1, { error: 'Order must have at least one item' })
      .max(20, { error: 'Order cannot have more than 20 items' }),

    delivery_type: z.enum(
      ['fast', 'office_pickup', 'hand_to_hand'],
      { error: 'Delivery type must be: fast, office_pickup, or hand_to_hand' }
    ),

    payment_method: z.enum(
      ['card', 'cash_on_delivery'],
      { error: 'Payment method must be: card or cash_on_delivery' }
    ),

    client_name: z
      .string({ error: 'Client name is required' })
      .trim()
      .min(2, { error: 'Name must be at least 2 characters' })
      .max(100, { error: 'Name cannot exceed 100 characters' }),

    client_phone: z
      .string({ error: 'Phone number is required' })
      .trim()
      .regex(
        /^\+?[\d\s\-().]{7,20}$/,
        { error: 'Please provide a valid phone number' }
      ),

    client_address: z
      .string({ error: 'Delivery address is required' })
      .trim()
      .min(10, { error: 'Address must be at least 10 characters' })
      .max(500, { error: 'Address cannot exceed 500 characters' }),

    // Custom order description — what the client wants
    // Goes into the notes field until DB migration adds custom_description
    notes: z
      .string()
      .trim()
      .max(1000, { error: 'Description cannot exceed 1000 characters' })
      .optional(),

    // ─── Custom order optional fields ─────────────────────
    // These require the Supabase DB migration to be run first.
    // Until migration: validated here, stored in notes as fallback.
    // After migration: stored in dedicated columns.

    // Client's budget range
    budget_min: z
      .number({ error: 'Budget minimum must be a number' })
      .positive({ error: 'Budget minimum must be positive' })
      .optional(),

    budget_max: z
      .number({ error: 'Budget maximum must be a number' })
      .positive({ error: 'Budget maximum must be positive' })
      .optional(),

    // Requested completion deadline
    deadline: z
      .string()
      .regex(
        /^\d{4}-\d{2}-\d{2}$/,
        { error: 'Deadline must be in YYYY-MM-DD format' }
      )
      .optional(),

    // Reference image URLs (uploaded first via /uploads/image)
    reference_images: z
      .array(
        z.string()
          .trim()
          .url({ error: 'Each reference image must be a valid URL' })
          .refine(
            (url) => url.startsWith('https://'),
            { message: 'Reference image URLs must use HTTPS' }
          )
      )
      .max(3, { error: 'Cannot attach more than 3 reference images' })
      .optional(),
  })
  // Prevent duplicate product IDs in same order
  .refine(
    (data) => {
      const productIds = data.items.map((item) => item.product_id);
      return new Set(productIds).size === productIds.length;
    },
    {
      message: 'Duplicate products in order. Each product can only appear once.',
      path: ['items'],
    }
  )
  // Validate budget range (min must be <= max)
  .refine(
    (data) => {
      if (data.budget_min !== undefined && data.budget_max !== undefined) {
        return data.budget_min <= data.budget_max;
      }
      return true;
    },
    {
      message: 'Budget minimum cannot be greater than maximum',
      path: ['budget_min'],
    }
  )
  // Validate deadline is in the future
  .refine(
    (data) => {
      if (data.deadline) {
        return new Date(data.deadline) > new Date();
      }
      return true;
    },
    {
      message: 'Deadline must be a future date',
      path: ['deadline'],
    }
  );

// ─────────────────────────────────────────────────────────────
// UPDATE ORDER STATUS SCHEMA
// PATCH /api/v1/orders/:id/status
// Seller only — accept or reject pending orders
// rejection_reason required when rejecting
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// ORDER QUERY SCHEMA
// GET /api/v1/orders?page=1&limit=20&status=pending&as=client
//
// The `as` parameter allows a seller to view orders
// from their perspective as a buyer (outgoing orders).
// Without `as=client`, sellers see incoming orders by default.
// ─────────────────────────────────────────────────────────────
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

  // NEW — allows seller to view orders they placed as a buyer
  // GET /api/v1/orders?as=client → seller sees their own purchases
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