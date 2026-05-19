'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validators/auth.validator');

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again in 15 minutes.',
    errors: null,
  },
});

const router = Router();

router.post(
  '/register',
  validate({ body: registerSchema }),
  authController.register
);

router.post(
  '/login',
  validate({ body: loginSchema }),
  authController.login
);

router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refreshToken
);

router.post(
  '/verify-otp',
  validate({ body: verifyOtpSchema }),
  authController.verifyOtp
);

router.get('/me', authenticate, authController.getMe);

router.put(
  '/me',
  authenticate,
  validate({ body: updateProfileSchema }),
  authController.updateProfile
);

router.post('/logout', authenticate, authController.logout);

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  validate({ body: resetPasswordSchema }),
  authController.resetPassword
);

module.exports = router;
