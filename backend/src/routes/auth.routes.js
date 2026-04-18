'use strict';

const { Router } = require('express');
const { z } = require('zod'); // ✅ FIX HERE
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} = require('../validators/auth.validator');

const router = Router();

// PUBLIC ROUTES

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
  validate({
    body: z.object({
      refresh_token: z
        .string({ error: 'Refresh token is required' })
        .min(1, { error: 'Refresh token is required' }),
    }),
  }),
  authController.refreshToken
);

// PROTECTED ROUTES

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