'use strict';

const { Router }       = require('express');
const wishlistController = require('../controllers/wishlist.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole }  = require('../middlewares/role.middleware');
const { validate,
        validateId,
        validatePagination } = require('../middlewares/validate.middleware');
const { addToWishlistSchema } = require('../validators/wishlist.validator');

const router = Router();

// All wishlist routes require authentication and client role
router.use(authenticate);
router.use(requireRole('client'));

// GET /api/v1/wishlist
router.get(
  '/',
  validatePagination(),
  wishlistController.getWishlist
);

// POST /api/v1/wishlist
router.post(
  '/',
  validate({ body: addToWishlistSchema }),
  wishlistController.addToWishlist
);

// GET /api/v1/wishlist/:product_id/check
router.get(
  '/:product_id/check',
  validateId('product_id'),
  wishlistController.checkWishlist
);

// DELETE /api/v1/wishlist/:product_id
router.delete(
  '/:product_id',
  validateId('product_id'),
  wishlistController.removeFromWishlist
);

module.exports = router;