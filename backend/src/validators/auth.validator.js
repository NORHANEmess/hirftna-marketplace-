'use strict';

const { z } = require('zod');
const {
  createAuthSchemas,
  normalizeChangePasswordPayload,
  normalizeLoginPayload,
  normalizeRegisterPayload,
  normalizeVerifyOtpPayload,
} = require('../../../shared/schemas/auth.schema.cjs');

const {
  registerSchema: baseRegisterSchema,
  loginSchema: baseLoginSchema,
  updateProfileSchema,
  changePasswordSchema: baseChangePasswordSchema,
  refreshTokenSchema,
  verifyOtpSchema: baseVerifyOtpSchema,
} = createAuthSchemas(z);

const registerSchema = z.preprocess(normalizeRegisterPayload, baseRegisterSchema);
const loginSchema = z.preprocess(normalizeLoginPayload, baseLoginSchema);
const changePasswordSchema = z.preprocess(
  normalizeChangePasswordPayload,
  baseChangePasswordSchema
);
const verifyOtpSchema = z.preprocess(normalizeVerifyOtpPayload, baseVerifyOtpSchema);

const forgotPasswordSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ error: 'Please provide a valid email address' })
    .max(255, { error: 'Email is too long' }),
});

const resetPasswordSchema = z.object({
  token: z
    .string({ error: 'Reset token is required' })
    .min(1, { error: 'Reset token is required' }),
  new_password: z
    .string({ error: 'Password is required' })
    .min(8, { error: 'Password must be at least 8 characters' })
    .max(72, { error: 'Password cannot exceed 72 characters' }),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
