'use strict';

const { supabasePublic, supabaseAdmin } = require('../config/supabase');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

const AUTH_TIMEOUT_MS   = 6000;
const AUTH_RETRY_COUNT  = 1;
const AUTH_RETRY_DELAY_MS = 250;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientAuthError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const code    = error?.code || error?.cause?.code || '';
  return (
    code === 'ECONNRESET'   ||
    code === 'ETIMEDOUT'    ||
    code === 'ECONNABORTED' ||
    message.includes('fetch failed') ||
    message.includes('timeout')      ||
    message.includes('timed out')    ||
    message.includes('network')
  );
};

const createAuthTimeout = () => new Promise((_, reject) => {
  const error = new Error('Supabase auth request timed out');
  error.code = 'ETIMEDOUT';
  setTimeout(() => reject(error), AUTH_TIMEOUT_MS);
});

const verifySupabaseToken = async (token) => {
  let lastError = null;

  for (let attempt = 0; attempt <= AUTH_RETRY_COUNT; attempt += 1) {
    try {
      const result = await Promise.race([
        supabasePublic.auth.getUser(token),
        createAuthTimeout(),
      ]);
      return result;
    } catch (error) {
      lastError = error;

      if (!isTransientAuthError(error) || attempt === AUTH_RETRY_COUNT) throw error;

      logger.warn({
        message: 'Supabase auth verification failed transiently, retrying',
        attempt: attempt + 1,
        error:   error.message,
      });

      await sleep(AUTH_RETRY_DELAY_MS);
    }
  }

  throw lastError;
};

const loadDatabaseUser = async (userId) => {
  const { data: dbUser, error: dbError } = await supabaseAdmin
    .from('users')
    .select('id, email, full_name, phone, avatar_url, role, created_at')
    .eq('id', userId)
    .single();

  if (dbError || !dbUser) return null;

  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  return { ...dbUser, seller_id: seller?.id ?? null };
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      return sendError(res, 'Access denied. Invalid token format.', 401);
    }

    let authResult;
    try {
      authResult = await verifySupabaseToken(token);
    } catch (error) {
      logger.warn({
        message: 'Authentication temporarily unavailable',
        url:     req.originalUrl,
        ip:      req.ip,
        error:   error.message,
      });
      return sendError(res, 'Authentication service temporarily unavailable. Please try again.', 503);
    }

    const { data: { user: supabaseUser } = {}, error: authError } = authResult || {};

    if (authError || !supabaseUser) {
      logger.warn({ message: 'Invalid or expired token attempt', ip: req.ip, url: req.originalUrl });
      return sendError(res, 'Access denied. Invalid or expired token.', 401);
    }

    const dbUser = await loadDatabaseUser(supabaseUser.id);

    if (!dbUser) {
      logger.error({ message: 'Authenticated user not found in database', userId: supabaseUser.id });
      return sendError(res, 'User account not found. Please contact support.', 401);
    }

    req.user = dbUser;
    next();
  } catch (err) {
    logger.error({ message: 'Authentication middleware error', error: err.message });
    return sendError(res, 'Authentication failed. Please try again.', 401);
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      req.user = null;
      return next();
    }

    let authResult;
    try {
      authResult = await verifySupabaseToken(token);
    } catch (error) {
      logger.warn({
        message: 'Optional auth failed transiently, continuing as visitor',
        error:   error.message,
        url:     req.originalUrl,
      });
      req.user = null;
      return next();
    }

    const { data: { user: supabaseUser } = {}, error: authError } = authResult || {};

    if (authError || !supabaseUser) {
      req.user = null;
      return next();
    }

    req.user = await loadDatabaseUser(supabaseUser.id);
    next();
  } catch (err) {
    logger.warn({ message: 'Optional auth error, continuing as visitor', error: err.message });
    req.user = null;
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate };
