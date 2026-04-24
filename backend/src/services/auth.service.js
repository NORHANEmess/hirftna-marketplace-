'use strict';

const crypto = require('crypto');
const { supabasePublic, supabaseAdmin } = require('../config/supabase');
const { getConfig } = require('../config/env');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

const config = getConfig();
const OTP_TTL_MS = 10 * 60 * 1000;
const otpSessions = new Map();

const selectUserProfile = async (userId) => {
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, phone, avatar_url, role, created_at')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    return { user: null, error: profileError };
  }

  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  return {
    user: {
      ...userProfile,
      seller_id: seller?.id ?? null,
    },
    error: null,
  };
};

const isOtpEnabled = () => {
  const flag = String(process.env.AUTH_OTP_ENABLED || '').toLowerCase();
  return flag === '1' || flag === 'true';
};

const getOtpFromAddress = () =>
  process.env.OTP_EMAIL_FROM ||
  process.env.EMAIL_FROM ||
  'Hirftna <onboarding@resend.dev>';

const pruneExpiredOtpSessions = () => {
  const now = Date.now();

  for (const [token, session] of otpSessions.entries()) {
    if (session.expires_at <= now) {
      otpSessions.delete(token);
    }
  }
};

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const sendOtpEmail = async ({ email, code, fullName }) => {
  if (!config.resend.apiKey) {
    throw new AppError('OTP email delivery is not configured', 503);
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resend.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getOtpFromAddress(),
      to: [email],
      subject: 'Your Hirftna verification code',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #2f2a21;">
          <p>Hello${fullName ? ` ${fullName}` : ''},</p>
          <p>Your Hirftna verification code is:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${code}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    logger.error({
      message: 'Failed to send OTP email',
      email,
      status: response.status,
      body,
    });

    throw new AppError('Failed to send OTP email. Please try again.', 503);
  }
};

const createOtpSession = async ({ user, token, refresh_token }) => {
  pruneExpiredOtpSessions();

  const otp = generateOtpCode();
  const otpToken = crypto.randomUUID();

  await sendOtpEmail({
    email: user.email,
    code: otp,
    fullName: user.full_name,
  });

  otpSessions.set(otpToken, {
    user,
    token,
    refresh_token,
    otp,
    attempts: 0,
    expires_at: Date.now() + OTP_TTL_MS,
  });

  return {
    requires_otp: true,
    otp_token: otpToken,
    otp_expires_in: Math.floor(OTP_TTL_MS / 1000),
    user,
  };
};

const register = async ({ email, password, full_name, role, phone }) => {
  const { data: authData, error: authError } =
    await supabasePublic.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
      },
    });

  if (authError) {
    logger.warn({
      message: 'Registration failed',
      email,
      reason: authError.message,
    });

    const isDuplicate =
      authError.status === 422 ||
      authError.code === 'user_already_exists' ||
      authError.message.toLowerCase().includes('already') ||
      authError.message.toLowerCase().includes('registered');

    if (isDuplicate) {
      throw new AppError('An account with this email already exists', 409);
    }

    throw new AppError(authError.message, 400);
  }

  if (!authData.user) {
    throw new AppError('Registration failed. Please try again.', 500);
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .single();

    if (existingUser) {
      break;
    }

    logger.warn({
      message: `Waiting for user trigger - attempt ${attempt}/3`,
      userId: authData.user.id,
    });
  }

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      full_name,
      phone: phone || null,
      role: role || 'client',
      updated_at: new Date().toISOString(),
    })
    .eq('id', authData.user.id);

  if (updateError) {
    logger.error({
      message: 'Failed to update user profile after registration',
      userId: authData.user.id,
      error: updateError.message,
    });
  }

  const { user: userProfile, error: profileError } = await selectUserProfile(authData.user.id);

  if (profileError || !userProfile) {
    logger.error({
      message: 'Failed to fetch profile after registration',
      userId: authData.user.id,
    });

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role: role || 'client',
        seller_id: null,
      },
      token: authData.session?.access_token || null,
      refresh_token: authData.session?.refresh_token || null,
    };
  }

  logger.info({
    message: 'User registered successfully',
    userId: authData.user.id,
    role: userProfile.role,
  });

  return {
    user: userProfile,
    token: authData.session?.access_token || null,
    refresh_token: authData.session?.refresh_token || null,
  };
};

const login = async ({ email, password }) => {
  const { data: authData, error: authError } =
    await supabasePublic.auth.signInWithPassword({ email, password });

  if (authError) {
    logger.warn({
      message: 'Login failed',
      email,
      reason: authError.message,
    });

    throw new AppError('Invalid email or password', 401);
  }

  if (!authData.user || !authData.session) {
    throw new AppError('Login failed. Please try again.', 500);
  }

  const { user: userProfile, error: profileError } = await selectUserProfile(authData.user.id);

  if (profileError || !userProfile) {
    logger.error({
      message: 'User profile not found after login',
      userId: authData.user.id,
    });

    throw new AppError('User account not found. Please contact support.', 404);
  }

  logger.info({
    message: 'User logged in',
    userId: userProfile.id,
    role: userProfile.role,
    otpRequired: isOtpEnabled(),
  });

  if (isOtpEnabled()) {
    return createOtpSession({
      user: userProfile,
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });
  }

  return {
    user: userProfile,
    token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  };
};

const refreshToken = async (refresh_token) => {
  const { data: authData, error: authError } = await supabasePublic.auth
    .refreshSession({ refresh_token });

  if (authError) {
    logger.warn({
      message: 'Token refresh failed',
      reason: authError.message,
    });
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (!authData.user || !authData.session) {
    throw new AppError('Failed to refresh session. Please login again.', 401);
  }

  const { user: userProfile, error: profileError } = await selectUserProfile(authData.user.id);

  if (profileError || !userProfile) {
    logger.error({
      message: 'User profile not found after token refresh',
      userId: authData.user.id,
    });
    throw new AppError('User account not found. Please login again.', 404);
  }

  logger.info({
    message: 'Session refreshed successfully',
    userId: userProfile.id,
  });

  return {
    user: userProfile,
    token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  };
};

const verifyOtp = async ({ otp_token, otp }) => {
  pruneExpiredOtpSessions();

  const session = otpSessions.get(otp_token);

  if (!session || session.expires_at <= Date.now()) {
    otpSessions.delete(otp_token);
    throw new AppError('OTP session is invalid or has expired', 401);
  }

  if (session.attempts >= 5) {
    otpSessions.delete(otp_token);
    throw new AppError('Too many invalid OTP attempts. Please login again.', 429);
  }

  if (session.otp !== otp) {
    session.attempts += 1;
    throw new AppError('Invalid OTP code', 401);
  }

  otpSessions.delete(otp_token);

  return {
    user: session.user,
    token: session.token,
    refresh_token: session.refresh_token,
  };
};

const logout = async (userId) => {
  const { error } = await supabaseAdmin.auth.admin.signOut(userId);

  if (error) {
    logger.warn({
      message: 'Logout error - session may already be expired',
      userId,
      reason: error.message,
    });
  }

  logger.info({
    message: 'User logged out',
    userId,
  });
};

const getMe = async (userId) => {
  const { user: userProfile, error } = await selectUserProfile(userId);

  if (error || !userProfile) {
    throw new AppError('User profile not found', 404);
  }

  return userProfile;
};

const updateProfile = async (userId, updates) => {
  const { error } = await supabaseAdmin
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id')
    .single();

  if (error) {
    logger.error({
      message: 'Failed to update user profile',
      userId,
      error: error.message,
    });
    throw new AppError('Failed to update profile. Please try again.', 500);
  }

  logger.info({ message: 'User profile updated', userId });

  const { user: updatedUser } = await selectUserProfile(userId);
  return updatedUser;
};

const changePassword = async (userId, { old_password, new_password }) => {
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    throw new AppError('User not found', 404);
  }

  const { error: verifyError } = await supabasePublic.auth
    .signInWithPassword({
      email: userProfile.email,
      password: old_password,
    });

  if (verifyError) {
    throw new AppError('Current password is incorrect', 401);
  }

  const { error: updateError } = await supabaseAdmin.auth.admin
    .updateUserById(userId, { password: new_password });

  if (updateError) {
    logger.error({
      message: 'Failed to change password',
      userId,
      error: updateError.message,
    });
    throw new AppError('Failed to change password. Please try again.', 500);
  }

  await supabaseAdmin.auth.admin.signOut(userId);

  logger.info({ message: 'Password changed successfully', userId });
};

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
