'use strict';

const { Router }        = require('express');
const clientRatingController = require('../controllers/clientRating.controller');
const { authenticate }  = require('../middlewares/auth.middleware');
const { requireRole }   = require('../middlewares/role.middleware');
const { validate, validateId, validatePagination } = require('../middlewares/validate.middleware');
const { createClientRatingSchema } = require('../validators/clientRating.validator');

const router = Router();

// ─────────────────────────────────────────────────────────────
// POST /api/v1/client-ratings
// Seller rates a client after a COMPLETED order
// Auth: seller only
// ─────────────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireRole('seller'),
  validate({ body: createClientRatingSchema }),
  clientRatingController.createClientRating
);

// ─────────────────────────────────────────────────────────────
// GET /api/v1/client-ratings/client/:client_id
// Public — view all ratings a client has received
// ─────────────────────────────────────────────────────────────
router.get(
  '/client/:client_id',
  validateId('client_id'),
  validatePagination(),
  clientRatingController.getClientRatings
);

module.exports = router;
