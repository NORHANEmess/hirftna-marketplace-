'use strict';

const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// VALID ROLES
// Single source of truth for all roles in the system
// ─────────────────────────────────────────────────────────────
const VALID_ROLES = ['client', 'seller', 'admin'];

// ─────────────────────────────────────────────────────────────
// REQUIRE ROLE MIDDLEWARE
//
// Checks that the authenticated user has the required role.
// Must ALWAYS be used AFTER authenticate middleware.
//
// Usage:
//   // Single role
//   router.post('/products',
//     authenticate,
//     requireRole('seller'),
//     productController.create
//   );
//
//   // Multiple roles allowed
//   router.get('/orders',
//     authenticate,
//     requireRole('seller', 'admin'),
//     orderController.getAll
//   );
// ─────────────────────────────────────────────────────────────
const requireRole = (...roles) => {
  // ── Validate at route definition time ─────────────────────
  // Catches typos like requireRole('sellar') at server startup
  // NOT at runtime when user makes a request
  if (roles.length === 0) {
    throw new Error(
      'requireRole() requires at least one role argument'
    );
  }

  const invalidRoles = roles.filter(
    (role) => !VALID_ROLES.includes(role)
  );

  if (invalidRoles.length > 0) {
    throw new Error(
      `requireRole() received invalid roles: ${invalidRoles.join(', ')}. ` +
      `Valid roles are: ${VALID_ROLES.join(', ')}`
    );
  }

  // ── Return the actual middleware function ──────────────────
  return (req, res, next) => {
    // Guard: authenticate must run before requireRole
    // If req.user is missing → developer made a mistake
    if (!req.user) {
      logger.error({
        message: 'requireRole used without authenticate middleware',
        url:     req.originalUrl,
        method:  req.method,
      });

      return sendError(
        res,
        'Authentication required',
        401
      );
    }

    // ── Check if user role is allowed ─────────────────────
    // Role comes from DATABASE (set in auth.middleware.js)
    // User CANNOT fake their role by sending it in the request
    if (!roles.includes(req.user.role)) {
      logger.warn({
        message:       'Unauthorized role access attempt',
        userId:        req.user.id,
        userRole:      req.user.role,
        requiredRoles: roles,
        url:           req.originalUrl,
        method:        req.method,
        ip:            req.ip,
      });

      return sendError(
        res,
        'You do not have permission to perform this action',
        403
      );
    }

    // ── Role is valid → continue to next middleware ────────
    next();
  };
};

// ─────────────────────────────────────────────────────────────
// REQUIRE VERIFIED SELLER
//
// Extra check for seller routes that need admin verification
// Use AFTER authenticate + requireRole('seller')
//
// Usage:
//   router.post('/promotions',
//     authenticate,
//     requireRole('seller'),
//     requireVerifiedSeller,
//     promotionController.create
//   );
// ─────────────────────────────────────────────────────────────
const requireVerifiedSeller = (req, res, next) => {
  // Guard: must run after authenticate
  if (!req.user) {
    return sendError(res, 'Authentication required', 401);
  }

  // Guard: must run after requireRole('seller')
  if (req.user.role !== 'seller') {
    return sendError(res, 'Seller account required', 403);
  }

  // Note: actual is_verified check happens in service layer
  // because we need a DB lookup to get sellers.is_verified
  // This middleware just guards the role
  next();
};

// ─────────────────────────────────────────────────────────────
// REQUIRE OWNERSHIP
//
// Verifies the authenticated user owns the resource
// by comparing req.user.id with a URL parameter.
//
// ⚠️  IMPORTANT LIMITATION:
// This only works for direct ID matches (e.g. /users/:id)
// For seller resources (products, orders) ownership is
// checked in the SERVICE LAYER via a DB lookup instead
// because product.id !== user.id
//
// Usage:
//   // User updating their own profile
//   router.put('/users/:id',
//     authenticate,
//     requireOwnership('id'),
//     userController.update
//   );
// ─────────────────────────────────────────────────────────────
const requireOwnership = (paramName = 'id') => {
  return (req, res, next) => {
    // Guard: must run after authenticate
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    // Admins bypass all ownership checks
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params[paramName];

    if (!resourceId) {
      logger.error({
        message: `requireOwnership: param "${paramName}" not found in req.params`,
        url:     req.originalUrl,
      });

      return sendError(res, 'Resource ID missing', 400);
    }

    // Compare user ID with resource ID
    if (req.user.id !== resourceId) {
      logger.warn({
        message:    'Ownership check failed',
        userId:     req.user.id,
        resourceId,
        url:        req.originalUrl,
        ip:         req.ip,
      });

      return sendError(
        res,
        'You do not have permission to modify this resource',
        403
      );
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireVerifiedSeller,
  requireOwnership,
};
