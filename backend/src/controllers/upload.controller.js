'use strict';

const uploadService              = require('../services/upload.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess }            = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// FIX — Validate bucket from query
// Only allow known buckets — no invalid values pass through
// ─────────────────────────────────────────────────────────────
const getBucketFromQuery = (query) => {
  const requested = query?.bucket;

  if (requested === undefined || requested === 'products') {
    return uploadService.BUCKETS.PRODUCTS;
  }

  if (requested === 'avatars') {
    return uploadService.BUCKETS.AVATARS;
  }

  throw new AppError(
    `Invalid bucket "${requested}". Allowed: products, avatars`,
    400
  );
};

// ─────────────────────────────────────────────────────────────
// UPLOAD SINGLE IMAGE
// POST /api/v1/uploads/image
// Protected — requires authentication
// Multipart/form-data — field name: "image"
// Optional query: ?bucket=avatars (default: products)
// ─────────────────────────────────────────────────────────────
const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(
      'No image file provided. Send as multipart/form-data with field "image".',
      400
    );
  }

  const bucket = getBucketFromQuery(req.query);

  const result = await uploadService.uploadImage(
    req.file,
    req.user.id,
    bucket
  );

  return sendSuccess(
    res,
    {
      url:      result.url,
      path:     result.path,
      bucket:   result.bucket,
      size:     result.size,
      mimeType: result.mimeType,
    },
    'Image uploaded successfully',
    201
  );
});

// ─────────────────────────────────────────────────────────────
// UPLOAD MULTIPLE IMAGES
// POST /api/v1/uploads/images
// Protected — requires authentication
// Multipart/form-data — field name: "images" (max 5)
// Optional query: ?bucket=avatars (default: products)
// ─────────────────────────────────────────────────────────────
const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError(
      'No image files provided. Send as multipart/form-data with field "images".',
      400
    );
  }

  const bucket = getBucketFromQuery(req.query);

  const result = await uploadService.uploadMultipleImages(
    req.files,
    req.user.id,
    bucket
  );

  const allSucceeded = result.failed === 0;

  return sendSuccess(
    res,
    {
      uploaded:  result.uploaded,
      failed:    result.failed,
      failures:  result.failures,
      total:     result.total,
      urls:      result.uploaded.map((r) => r.url),
    },
    allSucceeded
      ? 'All images uploaded successfully'
      : `${result.uploaded.length} of ${result.total} images uploaded`,
    201
  );
});

module.exports = {
  uploadImage,
  uploadMultipleImages,
};