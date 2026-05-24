'use strict';

const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const hpp            = require('hpp');
const compression    = require('compression');
const morgan         = require('morgan');
const rateLimit      = require('express-rate-limit');
const logger         = require('./utils/logger');
const { sendSuccess } = require('./utils/response');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// ─────────────────────────────────────────────────────────────
// 1. SECURITY MIDDLEWARE
// Applied first — before anything else
// ─────────────────────────────────────────────────────────────

// Helmet — sets 15 secure HTTP headers automatically
// Protects against: XSS, clickjacking, MIME sniffing etc.
app.use(helmet());

// CORS — controls which domains can call your API
// Only your React frontend is allowed
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [process.env.CLIENT_URL];

    // Allow localhost only in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:5173', 'http://localhost:3000','https://hirftna.vercel.app',);
    }

    // Allow requests with no origin (Postman, mobile apps)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn({
      message: 'CORS blocked request',
      origin,
    });

    const corsError = new Error('Not allowed by CORS');
        corsError.statusCode = 403;
        callback(corsError);
  },
  credentials:     true,
  methods:         ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:  ['Content-Type', 'Authorization'],
  exposedHeaders:  ['X-Total-Count'],
  maxAge:          86400, // preflight cache 24 hours
}));

// HPP — HTTP Parameter Pollution protection
// Prevents: GET /products?sort=price&sort=rating (array injection)
app.use(hpp());

// ─────────────────────────────────────────────────────────────
// 2. GENERAL MIDDLEWARE
// ─────────────────────────────────────────────────────────────

// Compression — gzip all responses (faster API)
app.use(compression());

// Body parsers — parse incoming request data
app.use(express.json({
  limit: '100kb', // max request body size (file uploads go through /uploads which uses multipart)
}));
app.use(express.urlencoded({
  extended: true,
  limit:    '100kb',
}));

// HTTP request logger — logs every request
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
  // Skip health check logs (too noisy)
  skip: (req) => req.path === '/health',
}));

// ─────────────────────────────────────────────────────────────
// 3. PROXY TRUST
// Must be set before rate limiters so express-rate-limit reads
// the real client IP from X-Forwarded-For (not Render's proxy IP).
// Without this, every user shares ONE rate limit bucket.
// ─────────────────────────────────────────────────────────────
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────────
// 4. RATE LIMITING
// Applied after body parsing so the body is available if needed
// ─────────────────────────────────────────────────────────────

// Public read limiter — generous limit for browsing endpoints
// Categories and products are hit constantly during normal browsing
const publicReadLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             2000,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    errors:  null,
  },
});

// Global rate limit — all API routes
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             500,             // 500 req/window — SPA sessions make many legitimate calls
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
    errors:  null,
  },
  skip: (req) => {
    return req.path === '/health';
  },
});
app.use('/api', globalLimiter);

// Strict rate limit — auth routes only (brute force protection)
const authLimiter = rateLimit({
  windowMs:               15 * 60 * 1000, // 15 minutes
  max:                    30,              // 30 failed attempts per window
  skipSuccessfulRequests: true,            // successful logins don't count
  standardHeaders:        true,
  legacyHeaders:          false,
  skip: (req) => req.path === '/me' && req.method === 'GET',
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    errors:  null,
  },
});
app.use('/api/v1/auth', authLimiter);

// ─────────────────────────────────────────────────────────────
// 4. HEALTH CHECK
// Simple endpoint to verify server is running
// Used by hosting platforms to check server status
// ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  sendSuccess(
    res,
    {
      status:      'OK',
      environment: process.env.NODE_ENV,
      timestamp:   new Date().toISOString(),
      version:     '1.0.0',
    },
    'Server is healthy'
  );
});
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ─────────────────────────────────────────────────────────────
// 5. API ROUTES
// Add new routes here as we build each feature
// All routes are prefixed with /api/v1/
// ─────────────────────────────────────────────────────────────

// Phase 2 — Authentication (STEP 18)
app.use('/api/v1/auth', require('./routes/auth.routes'));

// Phase 3 — Categories (STEP 21)
app.use('/api/v1/categories', publicReadLimiter, require('./routes/category.routes'));

// Phase 4 — Products (STEP 25)
app.use('/api/v1/products', publicReadLimiter, require('./routes/product.routes'));

// Phase 5 — File Uploads (STEP 28)
 app.use('/api/v1/uploads', require('./routes/upload.routes'));

// Phase 6 — Sellers (STEP 32)
 app.use('/api/v1/sellers', require('./routes/seller.routes'));

// Phase 7 — Orders (STEP 36)
 app.use('/api/v1/orders', require('./routes/order.routes'));

// Phase 8 — Reviews & Ratings (STEP 40)
 app.use('/api/v1/reviews', require('./routes/review.routes'));

// Phase 9 — Wishlist (STEP 43)
 app.use('/api/v1/wishlist', require('./routes/wishlist.routes'));

// Phase 10 — Notifications (STEP 46)
 app.use('/api/v1/notifications', require('./routes/notification.routes'));

// Phase 11 — Client Ratings (STEP 50)
app.use('/api/v1/client-ratings', require('./routes/clientRating.routes'));

// Phase 14 — User Public Profiles
app.use('/api/v1/users', require('./routes/user.routes'));

// Phase 12 — AI Chatbot (STEP 54)
app.use('/api/v1/chatbot', require('./routes/chatbot.routes'));

// Phase 13 — Admin (STEP 57)
app.use('/api/v1/admin', require('./routes/admin.routes'));

// Phase 17 — Promotions (STEP 70)
app.use('/api/v1/promotions', require('./routes/promotion.routes'));

// ─────────────────────────────────────────────────────────────
// 6. ERROR HANDLERS
// Must be LAST — after all routes
// ─────────────────────────────────────────────────────────────

// 404 handler — catches requests to unknown routes
app.use(notFound);

// Global error handler — catches ALL errors
// Must have 4 parameters (err, req, res, next)
app.use(errorHandler);

module.exports = app;
