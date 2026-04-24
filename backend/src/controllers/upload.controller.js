'use strict';

const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess } = require('../utils/response');
const uploadService = require('../services/upload.service');
const logger = require('../utils/logger');

const resolveRequestedBucket = (req) => req.query?.bucket || req.body?.bucket || undefined;

const uploadImage = asyncHandler(async (req, res) => {
  logger.info({
    message: 'Upload request received',
    contentType: req.headers['content-type'],
    hasFile: !!req.file,
    queryBucket: req.query?.bucket || null,
  });

  if (!req.file) {
    throw new AppError(
      'No image file provided. Send multipart/form-data with field name "image".',
      400
    );
  }

  const result = await uploadService.uploadImage(
    req.file,
    req.user.id,
    resolveRequestedBucket(req)
  );

  return sendSuccess(
    res,
    { url: result.url, bucket: result.bucket, path: result.path },
    'Image uploaded successfully',
    201
  );
});

const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No image files provided.', 400);
  }

  const result = await uploadService.uploadMultipleImages(
    req.files,
    req.user.id,
    resolveRequestedBucket(req)
  );

  return sendSuccess(
    res,
    {
      urls: result.uploaded.map((item) => item.url),
      uploaded: result.uploaded,
      failed: result.failed,
      failures: result.failures,
    },
    `${result.uploaded.length} image(s) uploaded successfully`,
    201
  );
});

module.exports = { uploadImage, uploadImages };
