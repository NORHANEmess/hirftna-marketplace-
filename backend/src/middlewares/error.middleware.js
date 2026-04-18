'use strict';

const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// ASYNC HANDLER
// Wraps async controllers — errors bubble to errorHandler
//
// Usage:
//   router.get('/products', asyncHandler(async (req, res) => {
//     const data = await service.getAll();
//     sendSuccess(res, data);
//   }));
// ─────────────────────────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ─────────────────────────────────────────────────────────────
// CUSTOM APP ERROR
// Use this to throw predictable errors from services
//
// Usage:
//   throw new AppError('Product not found', 404);
//   throw new AppError('Not authorized', 403);
// ─────────────────────────────────────────────────────────────
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────────────────────────
// NOT FOUND HANDLER
// Catches requests to routes that don't exist
// Placed AFTER all routes in app.js
// ─────────────────────────────────────────────────────────────
const notFound = (req, res, next) => {
  // FIX 1 — In production hide internal route details
  // In development show full path for easier debugging
  const message = process.env.NODE_ENV === 'production'
    ? 'The requested resource was not found'
    : `Route ${req.method} ${req.originalUrl} not found`;

  next(new AppError(message, 404));
};

// ─────────────────────────────────────────────────────────────
// POSTGRES/SUPABASE ERROR CODE MAP
// FIX 3 — Extended to cover more common DB constraint errors
// ─────────────────────────────────────────────────────────────
const POSTGRES_ERROR_MAP = {
  // Constraint violations
  '23505': { status: 409, message: 'This record already exists'       },
  '23503': { status: 404, message: 'Related record not found'         },
  '23502': { status: 400, message: 'Required field is missing'        },
  '23514': { status: 400, message: 'Value violates a check constraint'},
  '23000': { status: 400, message: 'Data integrity constraint failed' },

  // Data errors
  '22001': { status: 400, message: 'Value is too long for this field' },
  '22003': { status: 400, message: 'Numeric value out of range'       },
  '22P02': { status: 400, message: 'Invalid input format'             },

  // Auth/permission errors
  '42501': { status: 403, message: 'Insufficient permissions'         },

  // Connection errors
  '08000': { status: 503, message: 'Database connection error'        },
  '08006': { status: 503, message: 'Database connection failure'      },
};

// ─────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// Must be the LAST middleware in app.js (4 params required)
// ─────────────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  // ── Log full error details (never shown to client) ────────
  logger.error({
    message: err.message,
    name:    err.name,
    method:  req.method,
    // FIX 1 — still log full URL server-side for debugging
    // but never send it to the client in production
    url:     req.originalUrl,
    ip:      req.ip,
    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
    }),
  });

  // ── FIX 2 — Malformed JSON body ───────────────────────────
  // Express body-parser throws SyntaxError for invalid JSON
  // Example: client sends "{ name: 'test'" (missing closing })
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(
      res,
      'Invalid JSON in request body',
      400
    );
  }

  // ── Zod validation error ──────────────────────────────────
  if (err.name === 'ZodError') {
    const issues = err.issues ?? err.errors ?? [];
    return sendError(
      res,
      'Validation failed',
      400,
      issues.map((e) => ({
        field:   e.path.join('.') || 'unknown',
        message: e.message,
      }))
    );
  }

  // ── Our custom AppError ───────────────────────────────────
  if (err.name === 'AppError') {
    return sendError(res, err.message, err.statusCode);
  }

  // ── FIX 3 — Postgres/Supabase error codes ─────────────────
  if (err.code && POSTGRES_ERROR_MAP[err.code]) {
    const { status, message } = POSTGRES_ERROR_MAP[err.code];
    return sendError(res, message, status);
  }

  // ── JWT errors ────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token has expired — please login again', 401);
  }

  // ── Default: unknown/unexpected error ─────────────────────
  // Production → hide details (never expose internals)
  // Development → show full message for debugging
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return sendError(res, message, statusCode);
};

module.exports = { asyncHandler, AppError, notFound, errorHandler };
