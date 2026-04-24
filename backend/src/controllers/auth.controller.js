'use strict';

const authService = require('../services/auth.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess } = require('../utils/response');
const {
  normalizeChangePasswordPayload,
  normalizeLoginPayload,
  normalizeRegisterPayload,
  normalizeVerifyOtpPayload,
} = require('../../../shared/schemas/auth.schema');

const register = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { email, password, full_name, role, phone } = normalizeRegisterPayload(req.validated.body);

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
      user: result.user,
      token: result.token,
      refresh_token: result.refresh_token,
    },
    'Account created successfully',
    201
  );
});

const login = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { email, password } = normalizeLoginPayload(req.validated.body);
  const result = await authService.login({ email, password });

  return sendSuccess(
    res,
    result,
    result.requires_otp ? 'OTP verification required' : 'Login successful'
  );
});

const refreshToken = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { refresh_token } = req.validated.body;
  const result = await authService.refreshToken(refresh_token);

  return sendSuccess(
    res,
    {
      user: result.user,
      token: result.token,
      refresh_token: result.refresh_token,
    },
    'Session refreshed successfully'
  );
});

const verifyOtp = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { otp_token, otp } = normalizeVerifyOtpPayload(req.validated.body);
  const result = await authService.verifyOtp({ otp_token, otp });

  return sendSuccess(
    res,
    {
      user: result.user,
      token: result.token,
      refresh_token: result.refresh_token,
    },
    'OTP verified successfully'
  );
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  return sendSuccess(res, null, 'Logged out successfully');
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return sendSuccess(res, { user }, 'Profile fetched successfully');
});

const updateProfile = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { full_name, phone, avatar_url } = req.validated.body;
  const updates = {};

  if (full_name !== undefined) updates.full_name = full_name;
  if (phone !== undefined) updates.phone = phone;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  const updatedUser = await authService.updateProfile(req.user.id, updates);
  return sendSuccess(res, { user: updatedUser }, 'Profile updated successfully');
});

const changePassword = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { old_password, new_password } = normalizeChangePasswordPayload(req.validated.body);

  await authService.changePassword(req.user.id, {
    old_password,
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
  verifyOtp,
  logout,
  getMe,
  updateProfile,
  changePassword,
};
