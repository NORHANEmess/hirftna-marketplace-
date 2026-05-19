'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const chatbotController = require('../controllers/chatbot.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { chatbotMessageSchema } = require('../validators/chatbot.validator');

const router = Router();

// Rate limiting: Protects your free tier quota from being drained
const chatbotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20, // 20 messages max per hour per user
  keyGenerator: (req) => req.user.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You have reached the chatbot limit. Please wait before sending more messages.',
    errors: null,
  },
});

// POST /api/v1/chatbot
router.post(
  '/',
  authenticate,
  chatbotLimiter,
  validate({ body: chatbotMessageSchema }),
  chatbotController.sendMessage
);

module.exports = router;