'use strict';

const crypto = require('crypto');
const { supabasePublic, supabaseAdmin } = require('../config/supabase');
const { getConfig } = require('../config/env');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

const config = getConfig();
const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

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

const nodemailer = require('nodemailer');

const isOtpEnabled = () => {
  const flag = String(process.env.AUTH_OTP_ENABLED || '').toLowerCase();
  return flag === '1' || flag === 'true';
};

const smtpTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// crypto.randomInt is cryptographically secure (uses OS CSPRNG), Math.random() is not
const generateOtpCode = () => String(crypto.randomInt(100000, 1000000));

const sendOtpEmail = async ({ email, code, fullName }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new AppError('OTP email delivery is not configured', 503);
  }

  try {
    await smtpTransporter.sendMail({
      from: process.env.SMTP_FROM || `Hirftna <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Hirftna — Your verification code',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #2f2a21;">
          <p>Hello${fullName ? ` ${fullName}` : ''},</p>
          <p>Your Hirftna verification code is:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${code}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({
      message: 'Failed to send OTP email',
      email,
      error: err.message,
    });

    throw new AppError('Failed to send OTP email. Please try again.', 503);
  }
};

// One-way hash before storing — plaintext OTP never persists in memory
const hashOtp = (otp) =>
  crypto.createHash('sha256').update(otp).digest('hex');

const createOtpSession = async ({ user, token, refresh_token }) => {
  const otp = generateOtpCode();
  const otpToken = crypto.randomUUID();

  await sendOtpEmail({
    email: user.email,
    code: otp,
    fullName: user.full_name,
  });

  // Purge expired sessions for this user before inserting a new one
  await supabaseAdmin
    .from('otp_sessions')
    .delete()
    .lte('expires_at', new Date().toISOString());

  const { error: insertError } = await supabaseAdmin
    .from('otp_sessions')
    .insert({
      token: otpToken,
      user_data: user,
      auth_token: token,
      refresh_token,
      otp_hash: hashOtp(otp), // store hash, not plaintext
      attempts: 0,
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    });

  if (insertError) {
    logger.error({ message: 'Failed to persist OTP session', error: insertError.message });
    throw new AppError('Failed to create OTP session. Please try again.', 500);
  }

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
      // Account exists but may never have completed OTP verification.
      // If OTP is enabled, try to sign in with the same credentials so the
      // user can receive a fresh OTP and complete the flow — instead of
      // being permanently stuck with a 409.
      if (isOtpEnabled()) {
        const { data: loginData, error: loginError } =
          await supabasePublic.auth.signInWithPassword({ email, password });

        if (!loginError && loginData.user && loginData.session) {
          const { user: userProfile } = await selectUserProfile(loginData.user.id);

          if (userProfile) {
            logger.info({
              message: 'Duplicate registration — resuming via OTP session',
              userId: userProfile.id,
            });

            return createOtpSession({
              user: userProfile,
              token: loginData.session.access_token,
              refresh_token: loginData.session.refresh_token,
            });
          }
        }

        // signInWithPassword failed — email likely unconfirmed from a previous broken
        // registration (e.g. otp_sessions table was missing). Look up the user directly
        // and send a fresh OTP. Session tokens are null; after OTP verification the
        // frontend redirects to /login so the user can obtain a real session.
        const { data: existingUsers } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, phone, avatar_url, role')
          .eq('email', email.toLowerCase().trim())
          .limit(1);

        if (existingUsers && existingUsers.length > 0) {
          const partialUser = { ...existingUsers[0], seller_id: null };
          logger.info({
            message: 'Duplicate registration with unconfirmed email — resending OTP',
            userId: partialUser.id,
          });
          return createOtpSession({ user: partialUser, token: null, refresh_token: null });
        }
      }

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
    otpRequired: isOtpEnabled(),
  });

  if (isOtpEnabled()) {
    return createOtpSession({
      user: userProfile,
      token: authData.session?.access_token || null,
      refresh_token: authData.session?.refresh_token || null,
    });
  }

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

    const isEmailNotConfirmed =
      authError.message?.toLowerCase().includes('email not confirmed') ||
      authError.code === 'email_not_confirmed';

    if (isEmailNotConfirmed) {
      throw new AppError(
        'Email not verified. Register again to receive a new verification code.',
        403
      );
    }

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

  if (!authData.user.email_confirmed_at) {
    throw new AppError('Please verify your email first. Check your inbox for the verification code we sent when you registered.', 403);
  }

  logger.info({
    message: 'User logged in',
    userId: userProfile.id,
    role: userProfile.role,
  });

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
  // Purge expired sessions first
  await supabaseAdmin
    .from('otp_sessions')
    .delete()
    .lte('expires_at', new Date().toISOString());

  const { data: session, error: fetchError } = await supabaseAdmin
    .from('otp_sessions')
    .select('token, user_data, auth_token, refresh_token, otp_hash, attempts, expires_at')
    .eq('token', otp_token)
    .single();

  if (fetchError || !session) {
    throw new AppError('OTP session is invalid or has expired', 401);
  }

  if (session.attempts >= 5) {
    await supabaseAdmin.from('otp_sessions').delete().eq('token', otp_token);
    throw new AppError('Too many invalid OTP attempts. Please login again.', 429);
  }

  // Timing-safe comparison — prevents timing oracle attacks on the hash
  const incomingHash = Buffer.from(hashOtp(otp));
  const storedHash   = Buffer.from(session.otp_hash);

  const match =
    incomingHash.length === storedHash.length &&
    crypto.timingSafeEqual(incomingHash, storedHash);

  if (!match) {
    await supabaseAdmin
      .from('otp_sessions')
      .update({ attempts: session.attempts + 1 })
      .eq('token', otp_token);
    throw new AppError('Invalid OTP code', 401);
  }

  await supabaseAdmin.from('otp_sessions').delete().eq('token', otp_token);

  if (session.user_data?.id) {
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      session.user_data.id,
      { email_confirm: true }
    );
    if (confirmError) {
      logger.warn({
        message: 'Failed to confirm email after OTP',
        userId: session.user_data.id,
        reason: confirmError.message,
      });
    }
  }

  return {
    user: session.user_data,
    token: session.auth_token,
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


const sendResetEmail = async ({ email, resetLink }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new AppError('Email delivery is not configured', 503);
  }

  try {
    await smtpTransporter.sendMail({
      from: process.env.SMTP_FROM || `Hirftna <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Hirftna — Reset your password',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Reset your Hirftna password</h2>
          <p>You requested a password reset. Click the link below to set a new password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #728C67; color: white; text-decoration: none; border-radius: 8px;">Reset Password</a>
          <p style="margin-top: 16px; color: #666;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  } catch (err) {
    logger.error({
      message: 'Failed to send password reset email',
      email,
      error: err.message,
    });
    throw new AppError('Failed to send reset email. Please try again.', 503);
  }
};

const forgotPassword = async ({ email }) => {
  // Purge expired tokens first
  await supabaseAdmin
    .from('password_reset_tokens')
    .delete()
    .lte('expires_at', new Date().toISOString());

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .limit(1);

  if (!users || users.length === 0) {
    logger.warn({ message: 'Forgot password: email not found', email });
    return;
  }

  const user = users[0];
  const token = crypto.randomBytes(32).toString('hex');
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  // Remove any existing token for this user before inserting a new one
  await supabaseAdmin
    .from('password_reset_tokens')
    .delete()
    .eq('user_id', user.id);

  const { error: insertError } = await supabaseAdmin
    .from('password_reset_tokens')
    .insert({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
    });

  if (insertError) {
    logger.error({ message: 'Failed to persist reset token', userId: user.id, error: insertError.message });
    throw new AppError('Failed to initiate password reset. Please try again.', 500);
  }

  await sendResetEmail({ email: user.email, resetLink });

  logger.info({ message: 'Password reset email sent', userId: user.id });
};

const resetPassword = async ({ token, new_password }) => {
  // Purge expired tokens first
  await supabaseAdmin
    .from('password_reset_tokens')
    .delete()
    .lte('expires_at', new Date().toISOString());

  const { data: entry, error: fetchError } = await supabaseAdmin
    .from('password_reset_tokens')
    .select('user_id, expires_at')
    .eq('token', token)
    .single();

  if (fetchError || !entry) {
    throw new AppError('This reset link has expired or is invalid. Please request a new one.', 400);
  }

  // Delete the token immediately (one-time use)
  await supabaseAdmin.from('password_reset_tokens').delete().eq('token', token);

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    entry.user_id,
    { password: new_password }
  );

  if (updateError) {
    logger.error({
      message: 'Failed to reset password',
      userId: entry.user_id,
      error: updateError.message,
    });
    throw new AppError('Failed to reset password. Please try again.', 500);
  }

  logger.info({ message: 'Password reset successfully', userId: entry.user_id });
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
  forgotPassword,
  resetPassword,
};
