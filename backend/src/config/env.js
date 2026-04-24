'use strict';

const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// REQUIRED ENVIRONMENT VARIABLES
// ─────────────────────────────────────────────────────────────
const REQUIRED_ENV_VARS = [
  'PORT',
  'NODE_ENV',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLIENT_URL',
  'JWT_SECRET',
];

// ─────────────────────────────────────────────────────────────
// OPTIONAL ENV VARS (added later when features are built)
// ─────────────────────────────────────────────────────────────
const OPTIONAL_ENV_VARS = [
  'OPENAI_API_KEY',        // Phase 11 — AI Chatbot
  'STRIPE_SECRET_KEY',     // Phase 12 — Payments
  'STRIPE_WEBHOOK_SECRET', // Phase 12 — Payments
  'RESEND_API_KEY',        // Notifications email
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * FIX 4 — Strict port validation
 * Rejects values like "4000abc" that parseInt accepts silently
 * Only allows pure numeric strings within valid port range
 */
const isValidPort = (value) => {
  if (!/^\d+$/.test(value)) return false;
  const port = parseInt(value, 10);
  return port >= 1 && port <= 65535;
};

/**
 * FIX 1 + FIX 2 — Robust URL validation
 * Uses the built-in URL constructor which throws on invalid URLs
 * Ensures protocol is https and hostname is not empty
 * Rejects: "https://", "https://not a url", plain strings
 */
const isValidHttpsUrl = (value) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname.length > 0 &&
      url.hostname.includes('.')
    );
  } catch {
    return false;
  }
};

/**
 * FIX 3 — Check if a value is truly present
 * Rejects undefined, null, empty string, whitespace-only
 */
const isPresent = (value) =>
  value !== undefined &&
  value !== null &&
  typeof value === 'string' &&
  value.trim().length > 0;

// ─────────────────────────────────────────────────────────────
// MAIN VALIDATION FUNCTION
// ─────────────────────────────────────────────────────────────

/**
 * Validates all required environment variables exist
 * Called once at server startup — before anything else
 * If any required var is missing or invalid → exits process
 */
const validateEnv = () => {

  // ── Step 1: Check all required vars are present ───────────
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !isPresent(process.env[key])
  );

  if (missing.length > 0) {
    logger.error(
      `❌ Missing required environment variables: ${missing.join(', ')}`
    );
    logger.error(
      'Add the missing variables to your .env file and restart.'
    );
    process.exit(1);
  }

  // ── Step 2: Validate NODE_ENV ──────────────────────────────
  const validNodeEnvs = ['development', 'production', 'test'];
  if (!validNodeEnvs.includes(process.env.NODE_ENV)) {
    logger.error(
      `❌ Invalid NODE_ENV: "${process.env.NODE_ENV}". ` +
      `Must be one of: ${validNodeEnvs.join(', ')}`
    );
    process.exit(1);
  }

  // ── Step 3: Validate PORT (strict — no "4000abc") ─────────
  if (!isValidPort(process.env.PORT)) {
    logger.error(
      `❌ Invalid PORT: "${process.env.PORT}". ` +
      'Must be a whole number between 1 and 65535.'
    );
    process.exit(1);
  }

  // ── Step 4: Validate SUPABASE_URL (real URL check) ────────
  if (!isValidHttpsUrl(process.env.SUPABASE_URL)) {
    logger.error(
      `❌ Invalid SUPABASE_URL: "${process.env.SUPABASE_URL}". ` +
      'Must be a valid https URL (e.g. https://xxxx.supabase.co)'
    );
    process.exit(1);
  }

  // ── Step 5: Validate CLIENT_URL (real URL check) ──────────
  if (!isValidHttpsUrl(process.env.CLIENT_URL) &&
    !/^http:\/\/localhost(:\d+)?$/.test(process.env.CLIENT_URL)) {
    logger.error(
      `❌ Invalid CLIENT_URL: "${process.env.CLIENT_URL}". ` +
      'Must be a valid https URL or http://localhost:PORT'
    );
    process.exit(1);
  }

  // ── Step 6: Validate JWT_SECRET minimum length ────────────
  if (process.env.JWT_SECRET.trim().length < 32) {
    logger.error(
      '❌ JWT_SECRET is too short. ' +
      'Must be at least 32 characters for security.'
    );
    process.exit(1);
  }

  // ── Step 7: Warn about unset optional vars ────────────────
  // FIX 3 — use isPresent() to catch whitespace-only values
  const missingOptional = OPTIONAL_ENV_VARS.filter(
    (key) => !isPresent(process.env[key])
  );
  if (missingOptional.length > 0) {
    logger.warn(
      `⚠️  Optional env vars not set yet: ${missingOptional.join(', ')}`
    );
  }

  logger.info('✅ All environment variables validated successfully');
};

// ─────────────────────────────────────────────────────────────
// CONFIG OBJECT
// ─────────────────────────────────────────────────────────────

/**
 * Returns a typed config object for use throughout the app
 * Use this instead of reading process.env directly
 *
 * ⚠️  SECURITY WARNING:
 * Never log the full config object — it contains secret keys
 * Only log config.port or config.nodeEnv (non-sensitive values)
 */
const getConfig = () => ({
  // Server
  port:          parseInt(process.env.PORT, 10),
  nodeEnv:       process.env.NODE_ENV,
  isProduction:  process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Supabase
  supabase: {
    url:            process.env.SUPABASE_URL,
    anonKey:        process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Frontend
  clientUrl: process.env.CLIENT_URL,

  // Auth
  jwtSecret: process.env.JWT_SECRET,

  // External services (may be undefined until configured)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  stripe: {
    secretKey:     process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
});

module.exports = { validateEnv, getConfig };
