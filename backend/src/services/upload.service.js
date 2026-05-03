'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const sharp = require('sharp');

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const MAGIC_BYTES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const UPLOAD_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 10,
};

const BUCKETS = {
  PRODUCTS: 'products',
  AVATARS: 'avatars',
};

const BUCKET_CANDIDATES = {
  products: ['product-images', 'products', 'uploads', 'avatars'],
  avatars: ['avatars', 'profile-images', 'product-images', 'products'],
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validateFile = (file) => {
  if (!file) throw new AppError('No file provided', 400);

  const ext = path.extname(file.originalname || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new AppError(
      'Invalid file extension. Only .jpg, .jpeg, .png, .webp allowed.',
      400
    );
  }

  const buffer = file.buffer;
  const signatures = MAGIC_BYTES[file.mimetype];
  if (signatures) {
    const hasValidSignature = signatures.some((signature) =>
      signature.every((byte, index) => buffer[index] === byte)
    );

    if (file.mimetype === 'image/webp') {
      const webpMark = buffer.slice(8, 12).toString('ascii');
      if (!hasValidSignature || webpMark !== 'WEBP') {
        throw new AppError('File content does not match image type.', 400);
      }
    } else if (!hasValidSignature) {
      throw new AppError('File content does not match image type.', 400);
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      400
    );
  }
};

const sanitizeUserId = (userId) => {
  if (!userId || !UUID_REGEX.test(userId)) {
    throw new AppError('Invalid user ID format', 400);
  }

  return userId.toLowerCase();
};

const processImage = async (file) => {
  try {
    let processor = sharp(file.buffer).rotate();

    switch (file.mimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        processor = processor.jpeg({ quality: 85, mozjpeg: true });
        break;
      case 'image/png':
        processor = processor.png({ compressionLevel: 8 });
        break;
      case 'image/webp':
        processor = processor.webp({ quality: 85 });
        break;
      default:
        processor = processor.jpeg({ quality: 85, mozjpeg: true });
    }

    const processedBuffer = await processor.toBuffer();

    return {
      ...file,
      buffer: processedBuffer,
      size: processedBuffer.length,
    };
  } catch (error) {
    logger.error({
      message: 'Failed to process image with Sharp',
      error: error.message,
    });
    throw new AppError('Invalid or corrupted image file.', 400);
  }
};

const normalizeBucketPreference = (bucket) => {
  const value = String(bucket || '').trim().toLowerCase();

  if (!value || value === 'products' || value === 'product-images' || value === 'uploads') {
    return 'products';
  }

  if (value === 'avatars' || value === 'profile-images') {
    return 'avatars';
  }

  throw new AppError('Invalid storage bucket', 400);
};

const resolveBucketCandidates = (bucket) =>
  BUCKET_CANDIDATES[normalizeBucketPreference(bucket)] || BUCKET_CANDIDATES.products;

const buildFilePath = (userId, originalName, bucket) => {
  const safeUserId = sanitizeUserId(userId);
  const ext = path.extname(originalName || '').toLowerCase() || '.jpg';
  const prefix = normalizeBucketPreference(bucket) === 'avatars' ? 'avatars' : 'products';
  return `${prefix}/${safeUserId}/${Date.now()}-${uuidv4()}${ext}`;
};

const isMissingBucketError = (error) => {
  const message = `${error?.message || ''}`.toLowerCase();
  return (
    error?.statusCode === '404' ||
    error?.status === 404 ||
    (message.includes('bucket') &&
      (message.includes('not found') || message.includes('does not exist'))) ||
    message.includes('resource was not found')
  );
};

const uploadBufferToBucket = async ({ bucket, filePath, buffer, contentType }) =>
  supabaseAdmin.storage.from(bucket).upload(filePath, buffer, {
    contentType,
    cacheControl: '3600',
    upsert: false,
  });

const uploadImage = async (file, userId, bucket = BUCKETS.PRODUCTS) => {
  validateFile(file);

  const processedFile = await processImage(file);
  const candidateBuckets = resolveBucketCandidates(bucket);
  const filePath = buildFilePath(userId, file.originalname, bucket);
  const failures = [];

  for (const candidateBucket of candidateBuckets) {
    const { error } = await uploadBufferToBucket({
      bucket: candidateBucket,
      filePath,
      buffer: processedFile.buffer,
      contentType: file.mimetype,
    });

    if (!error) {
      const { data: urlData } = supabaseAdmin.storage
        .from(candidateBucket)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        logger.error({
          message: 'Failed to generate public URL after upload',
          bucket: candidateBucket,
          filePath,
        });
        throw new AppError('Failed to get image URL. Please try again.', 500);
      }

      logger.info({
        message: 'Image uploaded successfully',
        userId,
        bucket: candidateBucket,
        filePath,
        originalSize: file.size,
        processedSize: processedFile.size,
      });

      return {
        url: urlData.publicUrl,
        path: filePath,
        bucket: candidateBucket,
        size: processedFile.size,
        mimeType: file.mimetype,
      };
    }

    failures.push({
      bucket: candidateBucket,
      error: error.message,
      code: error.code || null,
    });

    if (!isMissingBucketError(error)) {
      logger.error({
        message: 'Supabase Storage upload failed',
        bucket: candidateBucket,
        filePath,
        error: error.message,
        code: error.code,
      });
      throw new AppError('Failed to upload image. Please try again.', 500);
    }
  }

  logger.error({
    message: 'Supabase Storage upload failed for all candidate buckets',
    requestedBucket: bucket,
    candidates: candidateBuckets,
    failures,
  });

  throw new AppError('Failed to upload image. Please check Supabase Storage buckets.', 500);
};

const deleteImage = async (filePath, bucket = BUCKETS.PRODUCTS) => {
  if (!filePath) throw new AppError('File path is required', 400);

  const candidateBuckets = resolveBucketCandidates(bucket);
  const failures = [];

  for (const candidateBucket of candidateBuckets) {
    const { error } = await supabaseAdmin.storage.from(candidateBucket).remove([filePath]);

    if (!error) {
      logger.info({ message: 'Image deleted', bucket: candidateBucket, filePath });
      return;
    }

    failures.push({
      bucket: candidateBucket,
      error: error.message,
      code: error.code || null,
    });

    if (!isMissingBucketError(error)) {
      logger.error({
        message: 'Failed to delete image',
        bucket: candidateBucket,
        filePath,
        error: error.message,
      });
      throw new AppError('Failed to delete image', 500);
    }
  }

  logger.error({
    message: 'Failed to delete image from all candidate buckets',
    requestedBucket: bucket,
    filePath,
    failures,
  });
  throw new AppError('Failed to delete image', 500);
};

const uploadMultipleImages = async (files, userId, bucket = BUCKETS.PRODUCTS) => {
  if (!files || files.length === 0) {
    throw new AppError('No files provided', 400);
  }

  if (files.length > 5) {
    throw new AppError('Cannot upload more than 5 images at once', 400);
  }

  const results = await Promise.all(
    files.map((currentFile, index) =>
      uploadImage(currentFile, userId, bucket)
        .then((result) => ({ index, success: true, result }))
        .catch((error) => ({ index, success: false, error: error.message }))
    )
  );

  const successes = results.filter((result) => result.success);
  const failures = results.filter((result) => !result.success);

  if (failures.length > 0) {
    logger.error({
      message: 'Some images failed to upload',
      total: files.length,
      failed: failures.length,
      succeeded: successes.length,
      failures: failures.map((failure) => ({
        index: failure.index,
        file: files[failure.index]?.originalname,
        error: failure.error,
      })),
    });
  }

  if (successes.length === 0) {
    throw new AppError('All image uploads failed. Please try again.', 500);
  }

  return {
    uploaded: successes.map((success) => success.result),
    failed: failures.length,
    failures: failures.map((failure) => ({
      index: failure.index,
      file: files[failure.index]?.originalname,
      error: failure.error,
    })),
    total: files.length,
  };
};

module.exports = {
  uploadImage,
  deleteImage,
  uploadMultipleImages,
  BUCKETS,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  UPLOAD_RATE_LIMIT,
};
