'use strict';

const userService = require('../services/user.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess }  = require('../utils/response');

// GET /api/v1/users/:id/public
// Public — any authenticated user can view a client's trust profile.
// Returns only safe fields (no email, phone, private data).
const getPublicProfile = asyncHandler(async (req, res) => {
  const { id: userId } = req.validated?.params ?? req.params;
  const profile = await userService.getPublicProfile(userId);
  return sendSuccess(res, profile, 'User profile retrieved');
});

module.exports = { getPublicProfile };
