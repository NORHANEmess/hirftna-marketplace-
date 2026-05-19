const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────────────────────
// FIX 1 — Use sync ONLY at module load time (not during requests)
// This is the one acceptable exception to the no-sync rule:
// Logger must be ready before the first line of app code runs.
// Node.js docs recommend sync fs at startup for this exact case.
// It runs ONCE when server starts — never during request handling.
// ─────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, '..', '..', 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch (err) {
  // Directory already exists → ignore
  // Any other error → let it surface
  if (err.code !== 'EEXIST') throw err;
}

// ─────────────────────────────────────────────────────────────
// SENSITIVE FIELDS — redacted before writing to any log file
// ─────────────────────────────────────────────────────────────
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'secret',
  'api_key',
  'apikey',
  'stripe_key',
  'service_role',
  'access_token',
  'refresh_token',
];

// ─────────────────────────────────────────────────────────────
// FIX 2 — Circular reference safe redaction
// Uses a WeakSet to track visited objects
// If an object was already visited → return '[Circular]'
// Prevents infinite loops when logging req/res objects
// ─────────────────────────────────────────────────────────────
const redact = (obj, visited = new WeakSet()) => {
  // Not an object → return as-is (string, number, boolean, null)
  if (!obj || typeof obj !== 'object') return obj;

  // FIX 2 — Circular reference detected → stop recursion
  if (visited.has(obj)) return '[Circular]';

  // Mark this object as visited
  visited.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, visited));
  }

  // Handle plain objects
  return Object.keys(obj).reduce((acc, key) => {
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      key.toLowerCase().includes(field)
    );
    acc[key] = isSensitive
      ? '[REDACTED]'
      : redact(obj[key], visited);
    return acc;
  }, {});
};

// Apply redaction in the Winston format pipeline
const redactSensitiveData = format((info) => {
  // Redact message if it's an object
  if (typeof info.message === 'object') {
    info.message = redact(info.message);
  }

  // Redact any extra metadata fields
  Object.keys(info).forEach((key) => {
    if (!['level', 'message', 'timestamp', 'stack'].includes(key)) {
      info[key] = redact(info[key]);
    }
  });

  return info;
})();

// ─────────────────────────────────────────────────────────────
// LOGGER INSTANCE
// ─────────────────────────────────────────────────────────────
const logger = createLogger({
  // Production → warn + error only (less noise, better performance)
  // Development → everything including debug
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',

  format: format.combine(
    redactSensitiveData,
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),

  transports: [
    // ── 1. CONSOLE ─────────────────────────────────────────
    // Colored output in terminal during development
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const base = `${timestamp} [${level}]: ${stack || message}`;
          const extras = Object.keys(meta).filter(
            (k) => !['service', 'splat'].includes(k)
          );
          if (extras.length === 0) return base;
          const detail = extras.map((k) => `${k}=${JSON.stringify(meta[k])}`).join(' ');
          return `${base} | ${detail}`;
        })
      )
    }),

    // ── 2. ERROR LOG FILE ──────────────────────────────────
    // Only error level → quick debugging in production
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,  // 5MB per file
      maxFiles: 5,       // keep last 5 rotated files
    }),

    // ── 3. COMBINED LOG FILE ───────────────────────────────
    // All levels → full history of everything
    new transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880,  // 5MB per file
      maxFiles: 5,       // keep last 5 rotated files
    })
  ],

  // ── Capture uncaught exceptions ────────────────────────
  exceptionHandlers: [
    new transports.File({
      filename: path.join(logsDir, 'error.log')
    })
  ],

  // ── Capture unhandled promise rejections ───────────────
  rejectionHandlers: [
    new transports.File({
      filename: path.join(logsDir, 'error.log')
    })
  ],

  // Don't kill the process when a handled exception occurs
  exitOnError: false
});

module.exports = logger;
