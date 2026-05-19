'use strict';

const { Router } = require('express');
const { z } = require('zod');
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { validate, validateId } = require('../middlewares/validate.middleware');

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireRole('admin'));

// ─────────────────────────────────────────────────────────────
// QUERY / BODY SCHEMAS (inline — too small to warrant own file)
// ─────────────────────────────────────────────────────────────
const usersQuerySchema = z.object({
  page:     z.string().optional().transform((v) => parseInt(v ?? '1', 10)).pipe(z.number().int().min(1)),
  limit:    z.string().optional().transform((v) => parseInt(v ?? '20', 10)).pipe(z.number().int().min(1).max(100)),
  role:     z.enum(['client', 'seller', 'admin']).optional(),
  search:   z.string().trim().max(100).optional(),
  verified: z.enum(['true', 'false']).optional(),
});

const productsQuerySchema = z.object({
  page: z.string().optional().transform((v) => parseInt(v ?? '1', 10)).pipe(z.number().int().min(1)),
  limit: z.string().optional().transform((v) => parseInt(v ?? '20', 10)).pipe(z.number().int().min(1).max(100)),
  search: z.string().trim().max(100).optional(),
  category: z.string().uuid().optional(),
});

const verifySellerSchema = z.object({
  is_verified: z.boolean({ error: 'is_verified must be a boolean' }),
});

const updateRoleSchema = z.object({
  role: z.enum(['client', 'seller'], { error: 'Role must be "client" or "seller"' }),
});

const promotionsQuerySchema = z.object({
  status: z.enum(['pending', 'active', 'expired', 'rejected']).optional(),
  page:   z.string().optional().transform((v) => parseInt(v ?? '1', 10)).pipe(z.number().int().min(1)),
  limit:  z.string().optional().transform((v) => parseInt(v ?? '20', 10)).pipe(z.number().int().min(1).max(100)),
});

const rejectPromotionSchema = z.object({
  rejection_reason: z.string({ error: 'rejection_reason is required' }).trim().min(1).max(500),
});

// GET  /api/v1/admin/products
router.get('/products',
  validate({ query: productsQuerySchema }),
  adminController.listProducts
);

// GET  /api/v1/admin/users
router.get('/users',
  validate({ query: usersQuerySchema }),
  adminController.listUsers
);

// GET  /api/v1/admin/stats
router.get('/stats', adminController.getStats);

// PATCH /api/v1/admin/sellers/:id/verify
router.patch('/sellers/:id/verify',
  validateId(),
  validate({ body: verifySellerSchema }),
  adminController.verifySeller
);

// DELETE /api/v1/admin/products/:id
router.delete('/products/:id',
  validateId(),
  adminController.deleteProduct
);

// PATCH /api/v1/admin/users/:id/role
router.patch('/users/:id/role',
  validateId(),
  validate({ body: updateRoleSchema }),
  adminController.updateUserRole
);

// GET   /api/v1/admin/promotions
router.get('/promotions',
  validate({ query: promotionsQuerySchema }),
  adminController.listPromotions
);

// PATCH /api/v1/admin/promotions/:id/activate
router.patch('/promotions/:id/activate',
  validateId(),
  adminController.activatePromotion
);

// PATCH /api/v1/admin/promotions/:id/reject
router.patch('/promotions/:id/reject',
  validateId(),
  validate({ body: rejectPromotionSchema }),
  adminController.rejectPromotion
);

module.exports = router;
