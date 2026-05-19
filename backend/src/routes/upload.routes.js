// ════════════════════════════════════════════════════════════════════
// upload.routes.js
// FIX: Route accepts POST /api/v1/uploads/image with or without
//      ?bucket= query param. The bucket is always determined server-side.
//      The frontend was sending ?bucket=products which caused a 400.
// ════════════════════════════════════════════════════════════════════

'use strict';

const { Router }      = require('express');
const multer          = require('multer');
const rateLimit       = require('express-rate-limit');
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  // authenticate middleware always runs before this — req.user.id is guaranteed
  keyGenerator: (req) => req.user.id,
  message: { success: false, message: 'Too many upload requests. Please try again in a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

const router = Router();

// Configure multer — memory storage (file stays in RAM, not disk)
// We stream directly to Supabase Storage from memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 1,                   // Only 1 file per request
  },
  fileFilter: (req, file, cb) => {
    // Only accept image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

// POST /api/v1/uploads/image
// FIX: accepts with OR without ?bucket=products — bucket ignored, always determined server-side
// The ?bucket= param is stripped — we don't read it
router.post(
  '/image',
  authenticate,
  uploadLimiter,
  upload.single('image'),   // multer parses multipart/form-data, field name = 'image'
  uploadController.uploadImage
);

// POST /api/v1/uploads/images (multiple — for future use)
router.post(
  '/images',
  authenticate,
  uploadLimiter,
  upload.array('images', 5), // up to 5 images
  uploadController.uploadImages
);

module.exports = router;
