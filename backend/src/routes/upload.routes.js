'use strict';

const { Router }       = require('express');
const multer           = require('multer');
const rateLimit        = require('express-rate-limit');
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { AppError }     = require('../middlewares/error.middleware');
const {
  ALLOWED_MIME_TYPES,
  UPLOAD_RATE_LIMIT,
} = require('../services/upload.service');

const router = Router();

// ─────────────────────────────────────────────────────────────
// FIX 5 — Upload-specific rate limiting
// Stricter than global (10 uploads vs 100 requests)
// ─────────────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: UPLOAD_RATE_LIMIT.windowMs,
  max:      UPLOAD_RATE_LIMIT.max,
  message: {
    success: false,
    message: 'Too many uploads. Please wait 15 minutes before uploading again.',
    errors:  null,
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ─────────────────────────────────────────────────────────────
// MULTER CONFIGURATION
// Memory storage — file held in buffer for Supabase upload
// FIX — Import ALLOWED_MIME_TYPES from service (DRY)
// ─────────────────────────────────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // FIX — Use centralized ALLOWED_MIME_TYPES from service
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
        400
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize:  5 * 1024 * 1024, // 5MB
    files:     5,
    parts:     10,               // FIX — limit form parts
    fieldSize: 1024,             // FIX — limit field sizes
  },
});

// ─────────────────────────────────────────────────────────────
// FIX — Handle ALL multer error codes
// ─────────────────────────────────────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const multerErrors = {
      LIMIT_FILE_SIZE:    'File too large. Maximum size is 5MB.',
      LIMIT_FILE_COUNT:   'Too many files. Maximum is 5 images.',
      LIMIT_FIELD_COUNT:  'Too many fields in the request.',
      LIMIT_FIELD_KEY:    'Field name is too long.',
      LIMIT_FIELD_VALUE:  'Field value is too long.',
      LIMIT_PART_COUNT:   'Too many parts in the request.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected field. Use "image" or "images".',
    };

    const message = multerErrors[err.code] || `Upload error: ${err.message}`;
    return next(new AppError(message, 400));
  }
  next(err);
};

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

// POST /api/v1/uploads/image
router.post(
  '/image',
  authenticate,
  uploadLimiter,
  upload.single('image'),
  handleMulterError,
  uploadController.uploadImage
);

// POST /api/v1/uploads/images
router.post(
  '/images',
  authenticate,
  uploadLimiter,
  upload.array('images', 5),
  handleMulterError,
  uploadController.uploadMultipleImages
);

module.exports = router;