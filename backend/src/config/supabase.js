'use strict';

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const { getConfig } = require('./env');

// ─────────────────────────────────────────────────────────────
// SUPABASE CLIENTS
//
// Two separate clients with different permission levels:
//
// 1. supabasePublic — uses ANON key
//    → Only for verifying user JWT tokens in auth middleware
//    → Respects RLS policies (limited access)
//
// 2. supabaseAdmin — uses SERVICE ROLE key
//    → Used for ALL database operations in services
//    → Bypasses RLS policies (full database access)
//    → ⚠️  NEVER send this key to the frontend
//    → ⚠️  NEVER use this for auth token verification
// ─────────────────────────────────────────────────────────────

const config = getConfig();

// ── 1. PUBLIC CLIENT ──────────────────────────────────────────
const supabasePublic = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
      detectSessionInUrl: false,
    },
  }
);

// ── 2. ADMIN CLIENT ───────────────────────────────────────────
const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
      detectSessionInUrl: false,
    },
  }
);

// ─────────────────────────────────────────────────────────────
// CONNECTION TEST
// ─────────────────────────────────────────────────────────────

/**
 * Tests the Supabase connection at server startup.
 *
 * FIX 1 — Uses correct Supabase count syntax:
 *   { count: 'exact', head: true }
 *   → head: true  = no rows returned (faster, lighter)
 *   → count: exact = just verify the table is reachable
 *   → This never fails due to missing columns
 *
 * FIX 3 — Throws error instead of calling process.exit()
 *   → Caller (server.js) decides whether to exit
 *   → Easier to test and easier to add retry logic later
 */
const testConnection = async () => {
  try {
    const { error, count } = await supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact', head: true });

    if (error) {
      // FIX 2 — combine message into single string so
      // our Winston console formatter always prints it
      throw new Error(
        `Supabase query failed — ${error.message} ` +
        `(code: ${error.code || 'unknown'})`
      );
    }

    logger.info(
      `✅ Supabase connected successfully (${count} categories found)`
    );
  } catch (err) {
    // Re-throw with clear context so server.js can log + exit
    throw new Error(
      `❌ Supabase connection failed — ${err.message}. ` +
      'Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
    );
  }
};

module.exports = { supabasePublic, supabaseAdmin, testConnection };