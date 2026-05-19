'use strict';

const clientRatingService        = require('../services/clientRating.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendCollection } = require('../utils/response');

// POST /api/v1/client-ratings
// Seller rates a client after order completion
const createClientRating = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { order_id, rating, comment } = req.validated.body;

  const clientRating = await clientRatingService.createClientRating(
    req.user.id,
    { order_id, rating, comment }
  );

  return sendSuccess(res, { clientRating }, 'Client rated successfully', 201);
});

// GET /api/v1/client-ratings/client/:client_id
// Public — view ratings received by a client
const getClientRatings = asyncHandler(async (req, res) => {
  const { client_id } = req.params;
  const { page, limit } = req.validated?.query ?? {};

  const result = await clientRatingService.getClientRatings(client_id, { page, limit });

  return sendCollection(
    res,
    result.ratings,
    result.pagination,
    'Client ratings fetched successfully',
    ['ratings'],
    { avgRating: result.avgRating }
  );
});

module.exports = {
  createClientRating,
  getClientRatings,
};
