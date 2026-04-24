// shared/schemas/auth.schema.js
// ─────────────────────────────────────────────────────────────
// CONVERTED TO ES MODULE
// Vite (frontend) requires ESM. Node.js (backend) also supports ESM
// when package.json has "type": "module" OR when files use .mjs extension.
//
// If your backend package.json does NOT have "type": "module", the backend
// must require() this file differently — see the backend note at the bottom.
// ─────────────────────────────────────────────────────────────

function pickFirstDefined(...values) {
  return values.find((value) => value !== undefined);
}

export function createAuthSchemas(z) {
  const emailField = z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email({ error: 'Please provide a valid email address' })
    .max(255, { error: 'Email is too long' });

  const passwordField = z
    .string({ error: 'Password is required' })
    .min(8, { error: 'Password must be at least 8 characters' })
    .max(72, { error: 'Password cannot exceed 72 characters' });

  const fullNameField = z
    .string({ error: 'Full name is required' })
    .trim()
    .min(2, { error: 'Full name must be at least 2 characters' })
    .max(100, { error: 'Full name cannot exceed 100 characters' });

  const roleField = z
    .enum(['client', 'seller'], { error: 'Role must be either client or seller' })
    .default('client');

  const registerSchema = z
    .object({
      full_name: fullNameField,
      email: emailField,
      password: passwordField,
      confirm_password: z
        .string({ error: 'Please confirm your password' })
        .min(1, { error: 'Please confirm your password' }),
      role: roleField,
      phone: z
        .string()
        .trim()
        .min(7, { error: 'Phone number is too short' })
        .max(20, { error: 'Phone number is too long' })
        .optional(),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.confirm_password) {
        ctx.addIssue({
          code: 'custom',
          path: ['confirm_password'],
          message: 'Passwords do not match',
        });
      }
    });

  const loginSchema = z.object({
    email: emailField,
    password: z
      .string({ error: 'Password is required' })
      .min(1, { error: 'Password is required' })
      .max(72, { error: 'Password is too long' }),
  });

  const updateProfileSchema = z
    .object({
      full_name: fullNameField.optional(),
      phone: z
        .string()
        .trim()
        .min(7, { error: 'Phone number is too short' })
        .max(20, { error: 'Phone number is too long' })
        .optional(),
      avatar_url: z
        .string()
        .trim()
        .url({ error: 'Avatar must be a valid URL' })
        .optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided to update',
    });

  const changePasswordSchema = z
    .object({
      old_password: z
        .string({ error: 'Current password is required' })
        .min(1, { error: 'Current password is required' }),
      new_password: passwordField,
      confirm_password: z
        .string({ error: 'Please confirm your new password' })
        .min(1, { error: 'Please confirm your new password' }),
    })
    .superRefine((data, ctx) => {
      if (data.new_password !== data.confirm_password) {
        ctx.addIssue({
          code: 'custom',
          path: ['confirm_password'],
          message: 'Passwords do not match',
        });
      }
      if (data.old_password === data.new_password) {
        ctx.addIssue({
          code: 'custom',
          path: ['new_password'],
          message: 'New password must be different from current password',
        });
      }
    });

  const refreshTokenSchema = z.object({
    refresh_token: z
      .string({ error: 'Refresh token is required' })
      .min(1, { error: 'Refresh token is required' }),
  });

  const verifyOtpSchema = z.object({
    otp_token: z
      .string({ error: 'OTP token is required' })
      .min(1, { error: 'OTP token is required' }),
    otp: z
      .string({ error: 'OTP code is required' })
      .trim()
      .regex(/^\d{6}$/, { error: 'OTP code must be 6 digits' }),
  });

  return {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    changePasswordSchema,
    refreshTokenSchema,
    verifyOtpSchema,
  };
}

export function normalizeRegisterPayload(payload = {}) {
  return {
    full_name: pickFirstDefined(payload.full_name, payload.fullName, ''),
    email: pickFirstDefined(payload.email, ''),
    password: pickFirstDefined(payload.password, ''),
    confirm_password: pickFirstDefined(
      payload.confirm_password,
      payload.confirm,
      payload.confirmPassword,
      ''
    ),
    role: pickFirstDefined(payload.role, 'client'),
    phone: pickFirstDefined(payload.phone, undefined),
  };
}

export function normalizeLoginPayload(payload = {}) {
  return {
    email: pickFirstDefined(payload.email, ''),
    password: pickFirstDefined(payload.password, ''),
  };
}

export function normalizeChangePasswordPayload(payload = {}) {
  return {
    old_password: pickFirstDefined(
      payload.old_password,
      payload.current_password,
      payload.oldPassword,
      payload.currentPassword,
      ''
    ),
    new_password: pickFirstDefined(payload.new_password, payload.newPassword, ''),
    confirm_password: pickFirstDefined(
      payload.confirm_password,
      payload.confirm,
      payload.confirmPassword,
      ''
    ),
  };
}

export function normalizeVerifyOtpPayload(payload = {}) {
  return {
    otp_token: pickFirstDefined(payload.otp_token, payload.pending_token, payload.otpToken, ''),
    otp: pickFirstDefined(payload.otp, payload.code, ''),
  };
}

// ─────────────────────────────────────────────────────────────
// BACKEND COMPATIBILITY
// If your backend uses CommonJS (require()), add this at the
// bottom of the file OR rename the file to auth.schema.mjs
// and update backend imports to use createRequire + import()
// ─────────────────────────────────────────────────────────────