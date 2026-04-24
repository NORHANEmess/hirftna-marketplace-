'use strict';

const { z } = require('zod');

const optionalTrimmedString = (maxLength, message) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    },
    z.string().max(maxLength, { error: message }).optional()
  );

const optionalUuid = (message) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed === '' ? undefined : trimmed;
    },
    z.string().uuid({ error: message }).optional()
  );

const optionalHttpsUrl = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  },
  z
    .string()
    .url({ error: 'Avatar must be a valid URL' })
    .refine((url) => url.startsWith('https://'), {
      message: 'Avatar URL must use HTTPS only',
    })
    .optional()
);

const sellerBaseFields = {
  shop_name: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.trim() : value),
      z
        .string({ error: 'Shop name is required' })
        .min(2, { error: 'Shop name must be at least 2 characters' })
        .max(100, { error: 'Shop name cannot exceed 100 characters' })
    ),
  description: optionalTrimmedString(1000, 'Description cannot exceed 1000 characters'),
  bio: optionalTrimmedString(1000, 'Bio cannot exceed 1000 characters'),
  story: optionalTrimmedString(5000, 'Story cannot exceed 5000 characters'),
  location: optionalTrimmedString(200, 'Location cannot exceed 200 characters'),
  city: optionalTrimmedString(200, 'City cannot exceed 200 characters'),
  category_id: optionalUuid('Invalid category ID'),
  avatar_url: optionalHttpsUrl,
};

const createSellerSchema = z.object(sellerBaseFields);

const updateSellerSchema = z
  .object({
    ...sellerBaseFields,
    shop_name: sellerBaseFields.shop_name.optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'At least one field must be provided to update' }
  );

const sellerQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val ?? '1', 10);
      return Number.isNaN(parsed) ? 1 : parsed;
    })
    .pipe(z.number().int().min(1, { error: 'Page must be at least 1' })),

  limit: z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val ?? '20', 10);
      return Number.isNaN(parsed) ? 20 : parsed;
    })
    .pipe(
      z
        .number()
        .int()
        .min(1, { error: 'Limit must be at least 1' })
        .max(100, { error: 'Limit cannot exceed 100' })
    ),

  category_id: optionalUuid('Invalid category ID'),

  search: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : value),
    z.string().max(100, { error: 'Search query too long' }).optional()
  ),

  sort: z.enum(['newest', 'oldest', 'rating']).default('newest'),
});

module.exports = {
  createSellerSchema,
  updateSellerSchema,
  sellerQuerySchema,
};
