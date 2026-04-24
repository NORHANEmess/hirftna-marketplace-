'use strict';

const { z } = require('zod');
const {
  createAuthSchemas,
  normalizeChangePasswordPayload,
  normalizeLoginPayload,
  normalizeRegisterPayload,
  normalizeVerifyOtpPayload,
} = require('../../../shared/schemas/auth.schema');

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

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  verifyOtpSchema,
};
