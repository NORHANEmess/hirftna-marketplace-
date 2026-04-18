'use strict';

const { supabasePublic, supabaseAdmin } = require('../config/supabase');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// AUTHENTICATE MIDDLEWARE
//
// Verifies JWT token from Authorization header
// Attaches full user object to req.user
//
// Frontend must send:
//   Authorization: Bearer eyJhbGci...
//
// On success → req.user is set → next() called
// On failure → 401 response sent immediately
// ─────────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    // ── Step 1: Extract token from header ─────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(
        res,
        'Access denied. No token provided.',
        401
      );
    }

    // Extract token after "Bearer "
    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      return sendError(
        res,
        'Access denied. Invalid token format.',
        401
      );
    }

    // ── Step 2: Verify token with Supabase ─────────────────
    // supabasePublic uses ANON key — correct for verification
    // NEVER use supabaseAdmin here — wrong client for auth
    const {
      data: { user: supabaseUser },
      error: authError,
    } = await supabasePublic.auth.getUser(token);

    if (authError || !supabaseUser) {
      logger.warn({
        message: 'Invalid or expired token attempt',
        ip:      req.ip,
        url:     req.originalUrl,
      });

      return sendError(
        res,
        'Access denied. Invalid or expired token.',
        401
      );
    }

    // ── Step 3: Load full user from our database ───────────
    // Supabase Auth only gives us basic info (id, email)
    // Our users table has role, full_name, phone, avatar etc.
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, phone, avatar_url, role, created_at')
      .eq('id', supabaseUser.id)
      .single();

    if (dbError || !dbUser) {
      logger.error({
        message: 'Authenticated user not found in database',
        userId:  supabaseUser.id,
      });

      return sendError(
        res,
        'User account not found. Please contact support.',
        401
      );
    }

    // ── Step 4: Attach user to request object ─────────────
    // Every controller after this can access req.user
    // req.user.id, req.user.role, req.user.email etc.
    req.user = dbUser;

    next();
  } catch (err) {
    logger.error({
      message: 'Authentication middleware error',
      error:   err.message,
    });

    return sendError(
      res,
      'Authentication failed. Please try again.',
      401
    );
  }
};

// ─────────────────────────────────────────────────────────────
// OPTIONAL AUTHENTICATE MIDDLEWARE
//
// Same as authenticate but does NOT block if no token
// Used for public routes that behave differently when logged in
//
// Example: GET /api/v1/products
//   Visitor     → sees products (req.user = null)
//   Logged in   → sees products + wishlist status
//
// If valid token  → req.user is set
// If no token     → req.user = null → continues
// If invalid token → req.user = null → continues (never blocks)
// ─────────────────────────────────────────────────────────────
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // No token → continue as visitor
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      req.user = null;
      return next();
    }

    // Verify token
    const {
      data: { user: supabaseUser },
      error: authError,
    } = await supabasePublic.auth.getUser(token);

    if (authError || !supabaseUser) {
      // Invalid token → treat as visitor (never block)
      req.user = null;
      return next();
    }

    // Load user from our database
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, phone, avatar_url, role, created_at')
      .eq('id', supabaseUser.id)
      .single();

    // Set user or null if not found
    req.user = dbError || !dbUser ? null : dbUser;

    next();
  } catch (err) {
    // Never block the request on optional auth errors
    logger.warn({
      message: 'Optional auth error — continuing as visitor',
      error:   err.message,
    });
    req.user = null;
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate };
