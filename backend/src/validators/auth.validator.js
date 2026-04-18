'use strict';

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// REUSABLE FIELD SCHEMAS
// ─────────────────────────────────────────────────────────────

const emailField = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email({ error: 'Please provide a valid email address' })
  .max(255, { error: 'Email is too long' });

const passwordField = z
  .string({ error: 'Password is required' })
  .min(8,  { error: 'Password must be at least 8 characters' })
  .max(72, { error: 'Password cannot exceed 72 characters'  })
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    { error: 'Password must contain uppercase, lowercase, and a number' }
  );

const fullNameField = z
  .string({ error: 'Full name is required' })
  .trim()
  .min(2,   { error: 'Full name must be at least 2 characters' })
  .max(100, { error: 'Full name cannot exceed 100 characters'  })
  .regex(
    /^[a-zA-Z\u0080-\uFFFF\s'-]+$/,
    { error: 'Full name contains invalid characters' }
  );

// ─────────────────────────────────────────────────────────────
// REGISTER SCHEMA
// POST /api/v1/auth/register
// ─────────────────────────────────────────────────────────────
const registerSchema = z.object({
  email:     emailField,
  password:  passwordField,
  full_name: fullNameField,

  // FIX 1 — z.enum() in Zod v4 uses errorMap for custom errors
  role: z
    .enum(['client', 'seller'])
    .default('client'),

  phone: z
    .string()
    .trim()
    .regex(
      /^\+?[\d\s\-().]{7,20}$/,
      { error: 'Please provide a valid phone number' }
    )
    .optional(),
});

// ─────────────────────────────────────────────────────────────
// LOGIN SCHEMA
// POST /api/v1/auth/login
// ─────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: 'Password is required' })
    .min(1,  { error: 'Password is required' })
    .max(72, { error: 'Password is too long'  }),
});

// ─────────────────────────────────────────────────────────────
// UPDATE PROFILE SCHEMA
// PUT /api/v1/auth/me
// ─────────────────────────────────────────────────────────────
const updateProfileSchema = z
  .object({
    full_name: fullNameField.optional(),
    phone: z
      .string()
      .trim()
      .regex(
        /^\+?[\d\s\-().]{7,20}$/,
        { error: 'Please provide a valid phone number' }
      )
      .optional(),
    avatar_url: z
      .string()
      .trim()
      .url({ error: 'Avatar must be a valid URL' })
      .optional(),
  })
  // FIX 2 — .refine() uses 'message' not 'error' in Zod v4
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided to update' }
  );

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD SCHEMA
// POST /api/v1/auth/change-password
// ─────────────────────────────────────────────────────────────
const changePasswordSchema = z
  .object({
    current_password: z
      .string({ error: 'Current password is required' })
      .min(1, { error: 'Current password is required' }),
    new_password:     passwordField,
    confirm_password: z
      .string({ error: 'Please confirm your new password' })
      .min(1, { error: 'Please confirm your new password' }),
  })
  // FIX 2 — use 'message' not 'error' in .refine()
  .refine(
    (data) => data.new_password === data.confirm_password,
    {
      message: 'Passwords do not match',
      path:    ['confirm_password'],
    }
  )
  .refine(
    (data) => data.current_password !== data.new_password,
    {
      message: 'New password must be different from current password',
      path:    ['new_password'],
    }
  );

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
};
