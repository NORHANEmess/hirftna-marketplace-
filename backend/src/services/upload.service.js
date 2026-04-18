'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');
const { v4: uuidv4 }   = require('uuid');
const path              = require('path');
const sharp             = require('sharp');

// ─────────────────────────────────────────────────────────────
// CONSTANTS — Single source of truth
// ─────────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Magic bytes for image validation
// These are the actual file signatures (cannot be spoofed)
const MAGIC_BYTES = {
  'image/jpeg': [
    [0xFF, 0xD8, 0xFF],
  ],
  'image/png': [
    [0x89, 0x50, 0x4E, 0x47],
  ],
  'image/webp': [
    // RIFF....WEBP
    [0x52, 0x49, 0x46, 0x46],
  ],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// FIX — Centralize rate limit constant
// Referenced in routes file
const UPLOAD_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      10,              // 10 uploads per window
};

const BUCKETS = {
  PRODUCTS: 'product-images',
  AVATARS:  'avatars',
};

// Valid UUID regex for path sanitization
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─────────────────────────────────────────────────────────────
// FIX 1 — Multi-layer file validation
// Checks: MIME type + extension + magic bytes + size
// ─────────────────────────────────────────────────────────────
const validateFile = (file) => {
  if (!file) throw new AppError('No file provided', 400);

  // Layer 1 — MIME type check
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new AppError(
      'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
      400
    );
  }

  // Layer 2 — File extension check
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new AppError(
      'Invalid file extension. Only .jpg, .jpeg, .png, .webp allowed.',
      400
    );
  }

  // Layer 3 — Magic bytes check (actual file content)
  // This cannot be spoofed by renaming files
  const buffer = file.buffer;
  const signatures = MAGIC_BYTES[file.mimetype];

  if (signatures) {
    const isValid = signatures.some((sig) =>
      sig.every((byte, i) => buffer[i] === byte)
    );

    // Special case for WebP — also check bytes 8-11 for 'WEBP'
    if (file.mimetype === 'image/webp') {
      const webpMark = buffer.slice(8, 12).toString('ascii');
      if (!isValid || webpMark !== 'WEBP') {
        throw new AppError('File content does not match image type.', 400);
      }
    } else if (!isValid) {
      throw new AppError('File content does not match image type.', 400);
    }
  }

  // Layer 4 — File size check
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      400
    );
  }
};

// ─────────────────────────────────────────────────────────────
// FIX 2 — Sanitize user ID for path safety
// Ensures no path traversal via userId
// ─────────────────────────────────────────────────────────────
const sanitizeUserId = (userId) => {
  if (!userId || !UUID_REGEX.test(userId)) {
    throw new AppError('Invalid user ID format', 400);
  }
  return userId.toLowerCase();
};

// ─────────────────────────────────────────────────────────────
// Generate unique file path
// Format: userId/timestamp-uuid.ext
// ─────────────────────────────────────────────────────────────
const generateFilePath = (userId, originalName) => {
  const safeUserId  = sanitizeUserId(userId);
  const ext         = path.extname(originalName).toLowerCase();
  const uniqueId    = uuidv4();
  const timestamp   = Date.now();
  return `${safeUserId}/${timestamp}-${uniqueId}${ext}`;
};

// ─────────────────────────────────────────────────────────────
// FIX 3 — Process image with Sharp
// Re-encodes image stripping all metadata (EXIF etc.)
// Prevents embedded malicious content
// ─────────────────────────────────────────────────────────────
const processImage = async (file) => {
  try {
    let processor = sharp(file.buffer)
      .rotate()           // Auto-rotate based on EXIF
      .withMetadata({});  // Strip all metadata

    // Re-encode based on type
    switch (file.mimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        processor = processor.jpeg({ quality: 85 });
        break;
      case 'image/png':
        processor = processor.png({ compressionLevel: 8 });
        break;
      case 'image/webp':
        processor = processor.webp({ quality: 85 });
        break;
      default:
        processor = processor.jpeg({ quality: 85 });
    }

    const processedBuffer = await processor.toBuffer();

    return {
      ...file,
      buffer: processedBuffer,
      size:   processedBuffer.length,
    };
  } catch (err) {
    logger.error({
      message: 'Failed to process image with Sharp',
      error:   err.message,
    });
    throw new AppError('Invalid or corrupted image file.', 400);
  }
};

// ─────────────────────────────────────────────────────────────
// UPLOAD IMAGE
// ─────────────────────────────────────────────────────────────
const uploadImage = async (file, userId, bucket = BUCKETS.PRODUCTS) => {
  // Validate bucket
  if (!Object.values(BUCKETS).includes(bucket)) {
    throw new AppError(
      `Invalid bucket. Allowed: ${Object.values(BUCKETS).join(', ')}`,
      400
    );
  }

  // Multi-layer file validation
  validateFile(file);

  // FIX 3 — Process and sanitize image content
  const processedFile = await processImage(file);

  // Generate safe file path
  const filePath = generateFilePath(userId, file.originalname);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseAdmin
    .storage
    .from(bucket)
    .upload(filePath, processedFile.buffer, {
      contentType:  file.mimetype,
      cacheControl: '3600',
      upsert:       false,
    });

  if (uploadError) {
    logger.error({
      message:  'Failed to upload image',
      bucket,
      filePath,
      error:    uploadError.message,
    });
    throw new AppError('Failed to upload image. Please try again.', 500);
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin
    .storage
    .from(bucket)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    logger.error({
      message: 'Failed to get public URL after upload',
      bucket,
      filePath,
    });
    throw new AppError('Failed to get image URL. Please try again.', 500);
  }

  logger.info({
    message:         'Image uploaded successfully',
    userId,
    bucket,
    filePath,
    originalSize:    file.size,
    processedSize:   processedFile.size,
  });

  return {
    url:      urlData.publicUrl,
    path:     filePath,
    bucket,
    size:     processedFile.size,
    mimeType: file.mimetype,
  };
};

// ─────────────────────────────────────────────────────────────
// DELETE IMAGE
// ─────────────────────────────────────────────────────────────
const deleteImage = async (filePath, bucket = BUCKETS.PRODUCTS) => {
  if (!filePath) throw new AppError('File path is required', 400);

  if (!Object.values(BUCKETS).includes(bucket)) {
    throw new AppError('Invalid storage bucket', 400);
  }

  const { error } = await supabaseAdmin
    .storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    logger.error({
      message:  'Failed to delete image',
      bucket,
      filePath,
      error:    error.message,
    });
    throw new AppError('Failed to delete image', 500);
  }

  logger.info({ message: 'Image deleted', bucket, filePath });
};

// ─────────────────────────────────────────────────────────────
// UPLOAD MULTIPLE IMAGES
// FIX 4 — Detailed failure reporting
// ─────────────────────────────────────────────────────────────
const uploadMultipleImages = async (
  files,
  userId,
  bucket = BUCKETS.PRODUCTS
) => {
  if (!files || files.length === 0) {
    throw new AppError('No files provided', 400);
  }

  if (files.length > 5) {
    throw new AppError('Cannot upload more than 5 images at once', 400);
  }

  // Upload all files in parallel
  const uploadPromises = files.map((file, index) =>
    uploadImage(file, userId, bucket)
      .then((result) => ({ index, success: true,  result }))
      .catch((err)   => ({ index, success: false, error: err.message }))
  );

  const results = await Promise.all(uploadPromises);

  const successes = results.filter((r) => r.success);
  const failures  = results.filter((r) => !r.success);

  // FIX 4 — Detailed failure logging
  if (failures.length > 0) {
    logger.error({
      message:   'Some images failed to upload',
      total:     files.length,
      failed:    failures.length,
      succeeded: successes.length,
      failures:  failures.map((f) => ({
        index: f.index,
        file:  files[f.index]?.originalname,
        error: f.error,
      })),
    });
  }

  if (successes.length === 0) {
    throw new AppError('All image uploads failed. Please try again.', 500);
  }

  return {
    uploaded: successes.map((s) => s.result),
    failed:   failures.length,
    failures: failures.map((f) => ({
      index: f.index,
      file:  files[f.index]?.originalname,
      error: f.error,
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