'use strict';

const { z }          = require('zod');
const { sendError }  = require('../utils/response');
const logger         = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// ZOD V4 COMPATIBILITY HELPER
// Zod v4 uses .issues not .errors like v3
// ─────────────────────────────────────────────────────────────
const getZodIssues = (zodError) =>
  zodError.issues ?? zodError.errors ?? [];

// ─────────────────────────────────────────────────────────────
// VALIDATE MIDDLEWARE FACTORY
//
// Validates req.body, req.params, req.query against Zod schemas.
// Stores ALL validated data in req.validated for consistency.
//
// IMPORTANT — Express 5 compatibility:
// req.query is a getter-only property in Express 5
// We NEVER try to overwrite req.query directly
// Always use req.validated.query in controllers
//
// RULE: Controllers must ALWAYS use req.validated
// NEVER use req.body/req.params/req.query directly
// after validation middleware has run
//
// Usage:
//   router.post('/products',
//     authenticate,
//     validate({ body: createProductSchema }),
//     productController.create
//   );
// ─────────────────────────────────────────────────────────────
const validate = (schemas = {}) => {
  if (!schemas.body && !schemas.params && !schemas.query) {
    throw new Error(
      'validate() requires at least one schema: body, params, or query'
    );
  }

  return (req, res, next) => {
    const errors = [];

    // Initialize req.validated once
    req.validated = req.validated || {};

    // ── Validate req.body ────────────────────────────────
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        errors.push(
          ...getZodIssues(result.error).map((e) => ({
            location: 'body',
            field:    e.path.join('.') || 'unknown',
            message:  e.message,
          }))
        );
      } else {
        // Store in req.validated — single source of truth
        req.validated.body = result.data;
        // Also update req.body for Express compatibility
        req.body = result.data;
      }
    }

    // ── Validate req.params ──────────────────────────────
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(
          ...getZodIssues(result.error).map((e) => ({
            location: 'params',
            field:    e.path.join('.') || 'unknown',
            message:  e.message,
          }))
        );
      } else {
        // Store in req.validated — single source of truth
        req.validated.params = result.data;
        // Also update req.params for Express compatibility
        req.params = result.data;
      }
    }

    // ── Validate req.query ───────────────────────────────
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        errors.push(
          ...getZodIssues(result.error).map((e) => ({
            location: 'query',
            field:    e.path.join('.') || 'unknown',
            message:  e.message,
          }))
        );
      } else {
        // FIX — ONLY store in req.validated.query
        // Express 5: req.query is getter-only — NEVER overwrite it
        // Controllers MUST use req.validated.query
        req.validated.query = result.data;
      }
    }

    // ── Block request if any errors ───────────────────────
    if (errors.length > 0) {
      logger.warn({
        message: 'Validation failed',
        method:  req.method,
        url:     req.originalUrl,
        fields:  errors.map((e) => `${e.location}.${e.field}`),
      });

      return sendError(res, 'Validation failed', 400, errors);
    }

    next();
  };
};

// ─────────────────────────────────────────────────────────────
// UUID PARAM VALIDATOR
// ─────────────────────────────────────────────────────────────
const validateId = (paramName = 'id') => {
  const schema = z.object({
    [paramName]: z
      .string({ error: `${paramName} is required` })
      .uuid({ error: `${paramName} must be a valid UUID` }),
  });

  return validate({ params: schema });
};

// ─────────────────────────────────────────────────────────────
// PAGINATION VALIDATOR
// ─────────────────────────────────────────────────────────────
const validatePagination = () => {
  const schema = z.object({
    page: z
      .string()
      .optional()
      .transform((val) => {
        const parsed = parseInt(val ?? '1', 10);
        return isNaN(parsed) ? 1 : parsed;
      })
      .pipe(
        z.number()
         .int({ error: 'page must be a whole number' })
         .min(1, { error: 'page must be at least 1'  })
      ),
    limit: z
      .string()
      .optional()
      .transform((val) => {
        const parsed = parseInt(val ?? '20', 10);
        return isNaN(parsed) ? 20 : parsed;
      })
      .pipe(
        z.number()
         .int({ error: 'limit must be a whole number'  })
         .min(1,   { error: 'limit must be at least 1' })
         .max(100, { error: 'limit cannot exceed 100'  })
      ),
  });

  return validate({ query: schema });
};

module.exports = { validate, validateId, validatePagination };
