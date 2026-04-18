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
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:5174',  // Vite default
      'http://localhost:3000',  // fallback
    ];

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
// 2. RATE LIMITING
// Applied early — before parsing body (saves processing)
// ─────────────────────────────────────────────────────────────

// Global rate limit — all API routes
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             100,             // max 100 requests per window
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in 15 minutes.',
    errors:  null,
  },
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  },
});
app.use('/api', globalLimiter);

// Strict rate limit — auth routes only
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             10,              // max 10 auth attempts
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    errors:  null,
  },
});
app.use('/api/v1/auth', authLimiter);

// ─────────────────────────────────────────────────────────────
// 3. GENERAL MIDDLEWARE
// ─────────────────────────────────────────────────────────────

// Compression — gzip all responses (faster API)
app.use(compression());

// Body parsers — parse incoming request data
app.use(express.json({
  limit: '10mb', // max request body size
}));
app.use(express.urlencoded({
  extended: true,
  limit:    '10mb',
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
 app.use('/api/v1/categories', require('./routes/category.routes'));

// Phase 4 — Products (STEP 25)
  app.use('/api/v1/products', require('./routes/product.routes'));

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

// Phase 11 — AI Chatbot (STEP 50)
// app.use('/api/v1/chatbot', require('./routes/chatbot.routes'));

// Phase 12 — Payments (STEP 53)
// app.use('/api/v1/payments', require('./routes/payment.routes'));

// Phase 13 — Recommendations (STEP 56)
// app.use('/api/v1/recommendations', require('./routes/recommendation.routes'));

// Phase 14 — Admin (STEP 59)
// app.use('/api/v1/admin', require('./routes/admin.routes'));

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
