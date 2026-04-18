'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// CREATE CATEGORY SCHEMA
// POST /api/v1/categories
// ─────────────────────────────────────────────────────────────
const createCategorySchema = z.object({
  name: z
    .string({ error: 'Category name is required' })
    .trim()
    .min(2,   { error: 'Name must be at least 2 characters'  })
    .max(50,  { error: 'Name cannot exceed 50 characters'    }),

  slug: z
    .string({ error: 'Category slug is required' })
    .trim()
    .toLowerCase()
    .min(2,   { error: 'Slug must be at least 2 characters'  })
    .max(50,  { error: 'Slug cannot exceed 50 characters'    })
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      { error: 'Slug must be lowercase letters, numbers, and hyphens only' }
    ),

  icon_url: z
    .string()
    .trim()
    .url({ error: 'Icon must be a valid URL' })
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// UPDATE CATEGORY SCHEMA
// PUT /api/v1/categories/:id
// All fields optional — at least one required
// ─────────────────────────────────────────────────────────────
const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2,  { error: 'Name must be at least 2 characters' })
      .max(50, { error: 'Name cannot exceed 50 characters'   })
      .optional(),

    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2,  { error: 'Slug must be at least 2 characters' })
      .max(50, { error: 'Slug cannot exceed 50 characters'   })
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        { error: 'Slug must be lowercase letters, numbers, and hyphens only' }
      )
      .optional(),

    icon_url: z
      .string()
      .trim()
      .url({ error: 'Icon must be a valid URL' })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided to update' }
  );

// ─────────────────────────────────────────────────────────────
// SLUG PARAM SCHEMA
// GET /api/v1/categories/slug/:slug
// ─────────────────────────────────────────────────────────────
const slugParamSchema = z.object({
  slug: z
    .string({ error: 'Slug is required' })
    .trim()
    .min(1, { error: 'Slug cannot be empty' })
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      { error: 'Invalid slug format' }
    ),
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  slugParamSchema,
};