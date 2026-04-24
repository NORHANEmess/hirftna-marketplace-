'use strict';

function pickFirstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function parseQuantity(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 1 : parsed;
}

function createOrderSchemas(z) {
  const quantityField = z
    .number({ error: 'Quantity must be a number' })
    .int({ error: 'Quantity must be a whole number' })
    .min(1, { error: 'Quantity must be at least 1' })
    .max(100, { error: 'Quantity cannot exceed 100' });

  const orderItemSchema = z.object({
    product_id: z
      .string({ error: 'Product ID is required' })
      .uuid({ error: 'Invalid product ID' }),
    quantity: quantityField.default(1),
  });

  const createOrderSchema = z
    .object({
      product_id: z
        .string()
        .uuid({ error: 'Invalid product ID' })
        .optional(),
      quantity: quantityField.optional(),
      requirements: z
        .string()
        .trim()
        .max(1000, { error: 'Requirements cannot exceed 1000 characters' })
        .optional(),
      items: z
        .array(orderItemSchema, { error: 'Items must be an array' })
        .min(1, { error: 'Order must have at least one item' })
        .max(20, { error: 'Order cannot have more than 20 items' })
        .optional(),
      delivery_type: z
        .enum(['fast', 'office_pickup', 'hand_to_hand'], {
          error: 'Delivery type must be: fast, office_pickup, or hand_to_hand',
        })
        .optional(),
      payment_method: z
        .enum(['card', 'cash_on_delivery'], {
          error: 'Payment method must be: card or cash_on_delivery',
        })
        .optional(),
      client_name: z
        .string()
        .trim()
        .min(2, { error: 'Name must be at least 2 characters' })
        .max(100, { error: 'Name cannot exceed 100 characters' })
        .optional(),
      client_phone: z
        .string()
        .trim()
        .regex(/^\+?[\d\s\-().]{7,20}$/, {
          error: 'Please provide a valid phone number',
        })
        .optional(),
      client_address: z
        .string()
        .trim()
        .min(5, { error: 'Address must be at least 5 characters' })
        .max(500, { error: 'Address cannot exceed 500 characters' })
        .optional(),
      notes: z
        .string()
        .trim()
        .max(1000, { error: 'Description cannot exceed 1000 characters' })
        .optional(),
      budget_min: z
        .number({ error: 'Budget minimum must be a number' })
        .positive({ error: 'Budget minimum must be positive' })
        .optional(),
      budget_max: z
        .number({ error: 'Budget maximum must be a number' })
        .positive({ error: 'Budget maximum must be positive' })
        .optional(),
      deadline: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
          error: 'Deadline must be in YYYY-MM-DD format',
        })
        .optional(),
      reference_images: z
        .array(
          z
            .string()
            .trim()
            .url({ error: 'Each reference image must be a valid URL' })
        )
        .max(3, { error: 'Cannot attach more than 3 reference images' })
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.product_id && (!data.items || data.items.length === 0)) {
        ctx.addIssue({
          code: 'custom',
          path: ['product_id'],
          message: 'A product_id or items array is required',
        });
      }

      if (data.budget_min !== undefined && data.budget_max !== undefined && data.budget_min > data.budget_max) {
        ctx.addIssue({
          code: 'custom',
          path: ['budget_min'],
          message: 'Budget minimum cannot be greater than maximum',
        });
      }

      if (data.deadline && new Date(data.deadline) <= new Date()) {
        ctx.addIssue({
          code: 'custom',
          path: ['deadline'],
          message: 'Deadline must be a future date',
        });
      }

      if (data.items?.length) {
        const productIds = data.items.map((item) => item.product_id);
        if (new Set(productIds).size !== productIds.length) {
          ctx.addIssue({
            code: 'custom',
            path: ['items'],
            message: 'Duplicate products in order. Each product can only appear once.',
          });
        }
      }
    });

  return {
    quantityField,
    orderItemSchema,
    createOrderSchema,
  };
}

function normalizeCreateOrderPayload(payload = {}) {
  const next = { ...payload };

  next.product_id = pickFirstDefined(next.product_id, next.productId, undefined);
  next.quantity = parseQuantity(pickFirstDefined(next.quantity, 1));
  next.requirements = pickFirstDefined(next.requirements, next.description, undefined);
  next.notes = pickFirstDefined(next.notes, next.requirements, next.description, undefined);

  if (Array.isArray(next.items)) {
    next.items = next.items.map((item) => ({
      product_id: pickFirstDefined(item.product_id, item.productId),
      quantity: parseQuantity(pickFirstDefined(item.quantity, 1)),
    }));
  }

  ['budget_min', 'budget_max'].forEach((key) => {
    if (next[key] !== undefined && next[key] !== null && next[key] !== '') {
      next[key] = Number(next[key]);
    } else {
      delete next[key];
    }
  });

  return next;
}

function buildNormalizedOrderInput(payload = {}) {
  const normalized = normalizeCreateOrderPayload(payload);

  if (!normalized.items?.length && normalized.product_id) {
    normalized.items = [{
      product_id: normalized.product_id,
      quantity: normalized.quantity || 1,
    }];
  }

  return normalized;
}

module.exports = {
  createOrderSchemas,
  normalizeCreateOrderPayload,
  buildNormalizedOrderInput,
};
