'use strict';

// ─────────────────────────────────────────────────────────────
// LOAD ENVIRONMENT VARIABLES FIRST
// Must be before any other imports
// ─────────────────────────────────────────────────────────────
require('dotenv').config();

const { validateEnv }    = require('./config/env');
const { testConnection } = require('./config/supabase');
const logger             = require('./utils/logger');
const app                = require('./app');

// ─────────────────────────────────────────────────────────────
// STEP 1 — Validate environment variables
// ─────────────────────────────────────────────────────────────
validateEnv();

// ─────────────────────────────────────────────────────────────
// STEP 2 — Start the server
// ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 4000;

const server = app.listen(PORT, async () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);

  // ── STEP 3 — Test Supabase connection ───────────────────
  try {
    await testConnection();
  } catch (err) {
    logger.error(`❌ Database connection failed: ${err.message}`);
    logger.error('Fix your Supabase keys in .env and restart.');
    process.exit(1);
  }

  logger.info('✅ Backend is ready to accept requests');
});

// ─────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(() => {
    logger.info('✅ Server closed. All requests finished.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('❌ Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─────────────────────────────────────────────────────────────
// SAFETY NETS
// ─────────────────────────────────────────────────────────────

// FIX 1 — Safe server close helper
// Checks if server is listening before closing
const safeClose = (exitCode) => {
  if (server.listening) {
    server.close(() => process.exit(exitCode));
  } else {
    process.exit(exitCode);
  }
};

// FIX 2 — Fixed unhandledRejection
// No longer logs raw promise object
process.on('unhandledRejection', (reason) => {
  logger.error({
    message: 'Unhandled Promise Rejection',
    // FIX 2 — safe string conversion, no circular refs
    reason: reason instanceof Error
      ? reason.message
      : String(reason),
  });
  safeClose(1);
});

process.on('uncaughtException', (err) => {
  logger.error({
    message: 'Uncaught Exception',
    error:   err.message,
    stack:   err.stack,
  });
  // uncaughtException is unrecoverable — exit immediately
  process.exit(1);
});
