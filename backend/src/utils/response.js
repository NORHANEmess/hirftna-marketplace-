// ─────────────────────────────────────────────────────────────
// STANDARDIZED API RESPONSE UTILITY
//
// Every controller in the entire backend uses these functions.
// This guarantees 100% consistent response format.
//
// Usage:
//   const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
// ─────────────────────────────────────────────────────────────

/**
 * Send a successful API response
 *
 * @param {object} res        - Express response object
 * @param {*}      data       - Data to return (object, array, null)
 * @param {string} message    - Human readable success message
 * @param {number} statusCode - HTTP status code (default 200)
 *
 * Example response:
 * {
 *   "success": true,
 *   "message": "Products fetched successfully",
 *   "data": { ... }
 * }
 */
const sendSuccess = (
    res,
    data = null,
    message = 'Success',
    statusCode = 200
  ) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };
  
  /**
   * Send an error API response
   *
   * @param {object} res        - Express response object
   * @param {string} message    - Human readable error message
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {*}      errors     - Validation errors or details (optional)
   *
   * Example response:
   * {
   *   "success": false,
   *   "message": "Product not found",
   *   "errors": null
   * }
   */
  const sendError = (
    res,
    message = 'Something went wrong',
    statusCode = 500,
    errors = null
  ) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  };
  
  /**
   * Send a paginated list response
   *
   * @param {object} res        - Express response object
   * @param {array}  items      - Array of items for this page
   * @param {object} pagination - { page, limit, total }
   * @param {string} message    - Human readable success message
   *
   * Example response:
   * {
   *   "success": true,
   *   "message": "Products fetched",
   *   "data": {
   *     "items": [...],
   *     "pagination": {
   *       "page": 1,
   *       "limit": 20,
   *       "total": 150,
   *       "totalPages": 8,
   *       "hasNext": true,
   *       "hasPrev": false
   *     }
   *   }
   * }
   */
  const sendPaginated = (
    res,
    items,
    pagination,
    message = 'Data fetched successfully'
  ) => {
    // ── FIX 1 — Guard against missing pagination object ──────
    // If pagination is missing → this is a developer mistake
    // Throw a clear error immediately so it surfaces during
    // development — never silently send wrong data
    if (!pagination || typeof pagination !== 'object') {
      throw new Error(
        'sendPaginated requires a pagination object { page, limit, total }'
      );
    }
  
    const { page, limit, total } = pagination;
  
    // ── FIX 2 — Validate all pagination values are numbers ───
    // If any value is not a finite positive number → throw
    // This catches NaN, undefined, null, strings, negatives
    // Upstream Zod validators should catch this first,
    // but we defend here as a second safety layer
    if (
      !Number.isFinite(page)  || page  < 1 ||
      !Number.isFinite(limit) || limit < 1 ||
      !Number.isFinite(total) || total < 0
    ) {
      throw new Error(
        `sendPaginated received invalid pagination values: 
         page=${page}, limit=${limit}, total=${total}. 
         All must be positive finite numbers (total >= 0).`
      );
    }
  
    // ── FIX 3 — Ensure items is always an array ───────────────
    // If items is null/undefined → use empty array
    // If items is not an array → throw clear error
    // This enforces the contract: items is ALWAYS an array
    let safeItems;
    if (items === null || items === undefined) {
      safeItems = [];
    } else if (!Array.isArray(items)) {
      throw new Error(
        `sendPaginated requires items to be an array, received: ${typeof items}`
      );
    } else {
      safeItems = items;
    }
  
    // ── Calculate pagination metadata ─────────────────────────
    const totalPages = Math.ceil(total / limit);
  
    return res.status(200).json({
      success: true,
      message,
      data: {
        items: safeItems,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      },
    });
  };
  
  module.exports = { sendSuccess, sendError, sendPaginated };
 