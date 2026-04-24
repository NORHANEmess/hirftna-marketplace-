'use strict';

const { Router }         = require('express');
const wishlistController = require('../controllers/wishlist.controller');
const { authenticate }   = require('../middlewares/auth.middleware');
const {
  validate,
  validateId,
  validatePagination,
}                        = require('../middlewares/validate.middleware');
const { addToWishlistSchema } = require('../validators/wishlist.validator');

const router = Router();

// ─────────────────────────────────────────────────────────────
// ALL WISHLIST ROUTES REQUIRE AUTHENTICATION
//
// FIX 1: Removed router.use('/', authenticate, controller.getWishlist)
//   The original file had this line:
//     router.use('/', authenticate, controller.getWishlist);
//   'controller' is undefined — it should be 'wishlistController'
//   This caused a ReferenceError that crashed the wishlist router.
//
// FIX 2: Removed requireRole('client')
//   Sellers are also buyers on this platform.
//   Any authenticated user (client OR seller) can use the wishlist.
//   The only check needed is authenticate.
// ─────────────────────────────────────────────────────────────

router.use(authenticate); // All routes below require login

// GET /api/v1/wishlist
// Returns paginated list of saved products for the current user
router.get(
  '/',
  validatePagination(),
  wishlistController.getWishlist
);

// POST /api/v1/wishlist
// Add a product to wishlist
// Body: { product_id: "uuid" }
router.post(
  '/',
  validate({ body: addToWishlistSchema }),
  wishlistController.addToWishlist
);

// GET /api/v1/wishlist/:product_id/check
// Check if a specific product is in the user's wishlist
// Returns: { inWishlist: true/false }
router.get(
  '/:product_id/check',
  validateId('product_id'),
  wishlistController.checkWishlist
);

// DELETE /api/v1/wishlist/:product_id
// Remove a product from wishlist
router.delete(
  '/:product_id',
  validateId('product_id'),
  wishlistController.removeFromWishlist
);

module.exports = router;