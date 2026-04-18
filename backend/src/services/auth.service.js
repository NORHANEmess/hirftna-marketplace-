'use strict';

const { supabasePublic, supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────────────────────
const register = async ({ email, password, full_name, role, phone }) => {
  // Step 1 — Create auth user in Supabase Auth
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
      reason:  authError.message,
    });

    // FIX 3 — Check error code AND message for duplicates
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

  // FIX 4 — Wait for trigger to create the users row
  // Retry up to 3 times with 500ms delay
  // AFTER — clean version
  for (let attempt = 1; attempt <= 3; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .single();
  
    if (existingUser) break;
  
    logger.warn({
      message: `Waiting for user trigger — attempt ${attempt}/3`,
      userId:  authData.user.id,
    });
  }
  
  // Step 2 — Update users table with extra fields
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      full_name,
      phone:      phone || null,
      role:       role  || 'client',
      updated_at: new Date().toISOString(),
    })
    .eq('id', authData.user.id);

  if (updateError) {
    logger.error({
      message: 'Failed to update user profile after registration',
      userId:  authData.user.id,
      error:   updateError.message,
    });
  }

  // Step 3 — Fetch complete profile
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, phone, avatar_url, role, created_at')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !userProfile) {
    logger.error({
      message: 'Failed to fetch profile after registration',
      userId:  authData.user.id,
    });
    return {
      user: {
        id:        authData.user.id,
        email:     authData.user.email,
        full_name,
        role:      role || 'client',
      },
      token:         authData.session?.access_token  || null,
      refresh_token: authData.session?.refresh_token || null,
    };
  }

  logger.info({
    message: 'User registered successfully',
    userId:  authData.user.id,
    role:    userProfile.role,
  });

  return {
    user:          userProfile,
    token:         authData.session?.access_token  || null,
    refresh_token: authData.session?.refresh_token || null,
  };
};

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  const { data: authData, error: authError } =
    await supabasePublic.auth.signInWithPassword({ email, password });

  if (authError) {
    logger.warn({
      message: 'Login failed',
      email,
      reason:  authError.message,
    });
    // Generic message — never reveal if email exists
    throw new AppError('Invalid email or password', 401);
  }

  if (!authData.user || !authData.session) {
    throw new AppError('Login failed. Please try again.', 500);
  }

  // Fetch full profile from users table
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, phone, avatar_url, role, created_at')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !userProfile) {
    logger.error({
      message: 'User profile not found after login',
      userId:  authData.user.id,
    });
    throw new AppError('User account not found. Please contact support.', 404);
  }

  logger.info({
    message: 'User logged in',
    userId:  userProfile.id,
    role:    userProfile.role,
  });

  // FIX 2 — Return both access_token and refresh_token
  return {
    user:          userProfile,
    token:         authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  };
};

// REFRESH TOKEN
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

  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, phone, avatar_url, role, created_at')
    .eq('id', authData.user.id)
    .single();

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

// ─────────────────────────────────────────────────────────────
// LOGOUT
// FIX 1 — Properly invalidate user session using Admin API
// ─────────────────────────────────────────────────────────────
const logout = async (userId) => {
  // Use Admin API to sign out specific user
  // This invalidates ALL sessions for this user
  const { error } = await supabaseAdmin.auth.admin.signOut(userId);

  if (error) {
    logger.warn({
      message: 'Logout error — session may already be expired',
      userId,
      reason:  error.message,
    });
    // Never fail logout from client perspective
  }

  logger.info({
    message: 'User logged out',
    userId,
  });
};

// ─────────────────────────────────────────────────────────────
// GET ME
// ─────────────────────────────────────────────────────────────
const getMe = async (userId) => {
  const { data: userProfile, error } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, phone, avatar_url, role, created_at')
    .eq('id', userId)
    .single();

  if (error || !userProfile) {
    throw new AppError('User profile not found', 404);
  }

  return userProfile;
};

// ─────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────
const updateProfile = async (userId, updates) => {
  const { data: updatedUser, error } = await supabaseAdmin
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, email, full_name, phone, avatar_url, role, created_at')
    .single();

  if (error) {
    logger.error({
      message: 'Failed to update user profile',
      userId,
      error:   error.message,
    });
    throw new AppError('Failed to update profile. Please try again.', 500);
  }

  logger.info({ message: 'User profile updated', userId });

  return updatedUser;
};

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// FIX 5 — Verify current password safely
// ─────────────────────────────────────────────────────────────
const changePassword = async (userId, { current_password, new_password }) => {
  // Step 1 — Get user email
  const { data: userProfile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  if (profileError || !userProfile) {
    throw new AppError('User not found', 404);
  }

  // Step 2 — Verify current password
  // We use a separate public client call to verify
  const { error: verifyError } = await supabasePublic.auth
    .signInWithPassword({
      email:    userProfile.email,
      password: current_password,
    });

  if (verifyError) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Step 3 — Update password via Admin API
  const { error: updateError } = await supabaseAdmin.auth.admin
    .updateUserById(userId, { password: new_password });

  if (updateError) {
    logger.error({
      message: 'Failed to change password',
      userId,
      error:   updateError.message,
    });
    throw new AppError('Failed to change password. Please try again.', 500);
  }

  // Step 4 — Invalidate all existing sessions
  // Forces user to login again with new password
  await supabaseAdmin.auth.admin.signOut(userId);

  logger.info({ message: 'Password changed successfully', userId });
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  changePassword,
};
