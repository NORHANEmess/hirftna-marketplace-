'use strict';

const { Router } = require('express');
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
} = require('../validators/auth.validator');

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

module.exports = router;
