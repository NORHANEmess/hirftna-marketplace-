// ════════════════════════════════════════════════════════════════════
// upload.routes.js
// FIX: Route accepts POST /api/v1/uploads/image with or without
//      ?bucket= query param. The bucket is always determined server-side.
//      The frontend was sending ?bucket=products which caused a 400.
// ════════════════════════════════════════════════════════════════════

'use strict';

const { Router }      = require('express');
const multer          = require('multer');
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middlewares/auth.middleware');

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
  upload.single('image'),   // multer parses multipart/form-data, field name = 'image'
  uploadController.uploadImage
);

// POST /api/v1/uploads/images (multiple — for future use)
router.post(
  '/images',
  authenticate,
  upload.array('images', 5), // up to 5 images
  uploadController.uploadImages
);

module.exports = router;


// ════════════════════════════════════════════════════════════════════
// upload.controller.js
// FIX: Ignore ?bucket= query param entirely.
//      Always upload to a fixed 'products' bucket in Supabase Storage.
//      Returns { url: "https://..." } — frontend uses this URL.
// ════════════════════════════════════════════════════════════════════

// 'use strict';

// const { supabaseAdmin }          = require('../config/supabase');
// const { asyncHandler, AppError } = require('../middlewares/error.middleware');
// const { sendSuccess }            = require('../utils/response');
// const { v4: uuidv4 }             = require('uuid');
// const path                       = require('path');
// const logger                     = require('../utils/logger');

// // The bucket to upload to — always 'products'
// // FIX: We determine this server-side, NOT from ?bucket= query param
// const UPLOAD_BUCKET = 'products';

// const uploadImage = asyncHandler(async (req, res) => {
//   // FIX: Ignore req.query.bucket entirely
//   // The frontend sends ?bucket=products but we never read it

//   if (!req.file) {
//     throw new AppError('No image file provided. Use field name "image"', 400);
//   }

//   const { buffer, originalname, mimetype } = req.file;

//   // Generate unique filename to prevent overwrites
//   const ext      = path.extname(originalname).toLowerCase() || '.jpg';
//   const filename = `${uuidv4()}${ext}`;
//   const filePath = `uploads/${filename}`;

//   // Upload to Supabase Storage
//   const { data, error } = await supabaseAdmin.storage
//     .from(UPLOAD_BUCKET)
//     .upload(filePath, buffer, {
//       contentType:  mimetype,
//       cacheControl: '3600',
//       upsert:       false,
//     });

//   if (error) {
//     logger.error({
//       message:  'Failed to upload image to Supabase Storage',
//       filename,
//       error:    error.message,
//     });
//     throw new AppError('Failed to upload image. Please try again.', 500);
//   }

//   // Get the public URL
//   const { data: publicUrlData } = supabaseAdmin.storage
//     .from(UPLOAD_BUCKET)
//     .getPublicUrl(filePath);

//   const publicUrl = publicUrlData?.publicUrl;

//   if (!publicUrl) {
//     throw new AppError('Failed to generate image URL', 500);
//   }

//   logger.info({
//     message:  'Image uploaded successfully',
//     filename,
//     userId:   req.user.id,
//     url:      publicUrl,
//   });

//   // FIX: Return { url: "https://..." }
//   // Frontend reads: res.data?.data?.url ?? res.data?.url
//   return sendSuccess(res, { url: publicUrl }, 'Image uploaded successfully', 201);
// });

// const uploadImages = asyncHandler(async (req, res) => {
//   if (!req.files || req.files.length === 0) {
//     throw new AppError('No image files provided', 400);
//   }

//   const uploadedUrls = [];

//   for (const file of req.files) {
//     const { buffer, originalname, mimetype } = file;
//     const ext      = path.extname(originalname).toLowerCase() || '.jpg';
//     const filename = `${uuidv4()}${ext}`;
//     const filePath = `uploads/${filename}`;

//     const { error } = await supabaseAdmin.storage
//       .from(UPLOAD_BUCKET)
//       .upload(filePath, buffer, { contentType: mimetype, upsert: false });

//     if (error) {
//       logger.error({ message: 'Failed to upload image', filename, error: error.message });
//       continue; // Skip failed uploads, continue with others
//     }

//     const { data: publicUrlData } = supabaseAdmin.storage
//       .from(UPLOAD_BUCKET)
//       .getPublicUrl(filePath);

//     if (publicUrlData?.publicUrl) {
//       uploadedUrls.push(publicUrlData.publicUrl);
//     }
//   }

//   return sendSuccess(res, { urls: uploadedUrls }, 'Images uploaded successfully', 201);
// });

// module.exports = { uploadImage, uploadImages };