'use strict';

const authService                  = require('../services/auth.service');
const { asyncHandler, AppError }   = require('../middlewares/error.middleware');
const { sendSuccess }              = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// IMPORTANT — Validation Pattern
// Always use req.validated.body — NEVER req.body directly
// Throws 500 if validation middleware was not applied
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// REGISTER
// POST /api/v1/auth/register
// Public — no authentication required
// ─────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { email, password, full_name, role, phone } = req.validated.body;

  const result = await authService.register({
    email,
    password,
    full_name,
    role,
    phone,
  });

  return sendSuccess(
    res,
    {
      user:          result.user,
      token:         result.token,
      refresh_token: result.refresh_token,
    },
    'Account created successfully',
    201
  );
});

// ─────────────────────────────────────────────────────────────
// LOGIN
// POST /api/v1/auth/login
// Public — no authentication required
// ─────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { email, password } = req.validated.body;

  const result = await authService.login({ email, password });

  return sendSuccess(
    res,
    {
      user:          result.user,
      token:         result.token,
      refresh_token: result.refresh_token,
    },
    'Login successful'
  );
});

// ─────────────────────────────────────────────────────────────
// REFRESH TOKEN
// POST /api/v1/auth/refresh
// Public — no authentication required
// ─────────────────────────────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { refresh_token } = req.validated.body;

  const result = await authService.refreshToken(refresh_token);

  return sendSuccess(
    res,
    {
      user:          result.user,
      token:         result.token,
      refresh_token: result.refresh_token,
    },
    'Session refreshed successfully'
  );
});

// ─────────────────────────────────────────────────────────────
// LOGOUT
// POST /api/v1/auth/logout
// Protected — requires authentication
// ─────────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  // req.user.id comes from JWT via authenticate middleware
  // Never trust a client-provided user ID
  await authService.logout(req.user.id);

  return sendSuccess(res, null, 'Logged out successfully');
});

// ─────────────────────────────────────────────────────────────
// GET ME
// GET /api/v1/auth/me
// Protected — requires authentication
// No body validation needed (GET request)
// ─────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  // Fetch fresh data from DB
  // req.user may be slightly stale from middleware
  const user = await authService.getMe(req.user.id);

  return sendSuccess(
    res,
    { user },
    'Profile fetched successfully'
  );
});

// ─────────────────────────────────────────────────────────────
// UPDATE PROFILE
// PUT /api/v1/auth/me
// Protected — requires authentication
// ─────────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  // Explicitly extract only allowed fields
  // Zod already stripped unknown fields — extra safety layer
  const { full_name, phone, avatar_url } = req.validated.body;

  // Build updates with only provided fields
  const updates = {};
  if (full_name  !== undefined) updates.full_name  = full_name;
  if (phone      !== undefined) updates.phone      = phone;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  const updatedUser = await authService.updateProfile(
    req.user.id,
    updates
  );

  return sendSuccess(
    res,
    { user: updatedUser },
    'Profile updated successfully'
  );
});

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// POST /api/v1/auth/change-password
// Protected — requires authentication
// ─────────────────────────────────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  // confirm_password already validated by Zod
  // Only pass current and new to service
  const { current_password, new_password } = req.validated.body;

  await authService.changePassword(req.user.id, {
    current_password,
    new_password,
  });

  return sendSuccess(
    res,
    null,
    'Password changed successfully. Please login again.'
  );
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
};