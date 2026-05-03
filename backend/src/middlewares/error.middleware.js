'use strict';

const logger = require('../utils/logger');
const { sendError } = require('../utils/response');
const { zodErrorToErrorMap } = require('../utils/validation');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

const notFound = (req, res, next) => {
  const message = process.env.NODE_ENV === 'production'
    ? 'The requested resource was not found'
    : `Route ${req.method} ${req.originalUrl} not found`;
  next(new AppError(message, 404));
};

const POSTGRES_ERROR_MAP = {
  '23505': { status: 409, message: 'This record already exists'        },
  '23503': { status: 404, message: 'Related record not found'          },
  '23502': { status: 400, message: 'Required field is missing'         },
  '23514': { status: 400, message: 'Value violates a check constraint' },
  '23000': { status: 400, message: 'Data integrity constraint failed'  },
  '22001': { status: 400, message: 'Value is too long for this field'  },
  '22003': { status: 400, message: 'Numeric value out of range'        },
  '22P02': { status: 400, message: 'Invalid input format'              },
  '42501': { status: 403, message: 'Insufficient permissions'          },
  '08000': { status: 503, message: 'Database connection error'         },
  '08006': { status: 503, message: 'Database connection failure'       },
};

const errorHandler = (err, req, res, next) => {
  logger.error({
    message: err.message,
    name:    err.name,
    method:  req.method,
    url:     req.originalUrl,
    ip:      req.ip,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 'Invalid JSON in request body', 400);
  }

  if (err.name === 'ZodError') {
    return sendError(res, 'Validation failed', 400, zodErrorToErrorMap(err));
  }

  if (err.name === 'AppError') {
    return sendError(res, err.message, err.statusCode);
  }

  if (err.code && POSTGRES_ERROR_MAP[err.code]) {
    const { status, message } = POSTGRES_ERROR_MAP[err.code];
    return sendError(res, message, status);
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token has expired — please login again', 401);
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return sendError(res, message, statusCode);
};

module.exports = { asyncHandler, AppError, notFound, errorHandler };
