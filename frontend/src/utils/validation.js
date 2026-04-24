// frontend/src/utils/validation.js

import { z } from 'zod';
import {
  createAuthSchemas,
  normalizeRegisterPayload,
  normalizeLoginPayload,
  normalizeChangePasswordPayload,
} from '../../../shared/schemas/auth.schema.js';

// ==============================
// SCHEMAS
// ==============================

const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} = createAuthSchemas(z);

// ==============================
// INTERNAL PARSER
// ==============================

function parseSchema(schema, payload) {
  const result = schema.safeParse(payload);

  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }

  const errors = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'root';
    if (!errors[field]) errors[field] = issue.message;
  }

  return { success: false, data: null, errors };
}

// ==============================
// VALIDATION (for forms)
// ==============================

export function validateRegister(raw) {
  const payload = normalizeRegisterPayload(raw);
  return parseSchema(registerSchema, payload);
}

export function validateLogin(raw) {
  const payload = normalizeLoginPayload(raw);
  return parseSchema(loginSchema, payload);
}

export function validateChangePassword(raw) {
  const payload = normalizeChangePasswordPayload(raw);
  return parseSchema(changePasswordSchema, payload);
}

export function validateUpdateProfile(raw) {
  return parseSchema(updateProfileSchema, raw);
}

// ==============================
// PARSE (for API) ✅ THIS WAS MISSING
// ==============================

export function parseRegisterPayload(raw) {
  return normalizeRegisterPayload(raw);
}

export function parseLoginPayload(raw) {
  return normalizeLoginPayload(raw);
}

export function parseChangePasswordPayload(raw) {
  return normalizeChangePasswordPayload(raw);
}

export function parseVerifyOtpPayload(raw) {
  return {
    otp_token: raw?.otp_token,
    otp: raw?.otp,
  };
}

export function parseOrderPayload(raw) {
  return raw; // عدليها لاحقًا إذا حبيتي validation للأوردر
}

// ==============================
// EXPORT NORMALIZERS (optional)
// ==============================

export {
  normalizeRegisterPayload,
  normalizeLoginPayload,
  normalizeChangePasswordPayload,
};