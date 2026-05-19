'use strict';

const { Router } = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { validate,
  validateId } = require('../middlewares/validate.middleware');
const {
  createOrderSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
  markReadySchema,
} = require('../validators/order.validator');

const router = Router();

// ─────────────────────────────────────────────────────────────
// ALL ORDER ROUTES REQUIRE AUTHENTICATION
// No public order endpoints
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// CLIENT ROUTES
// ─────────────────────────────────────────────────────────────

// POST /api/v1/orders
// Place a new order
router.post(
  '/',
  authenticate,
  validate({ body: createOrderSchema }),
  orderController.createOrder
);

// ─────────────────────────────────────────────────────────────
// SHARED ROUTES
// Accessible by client, seller, and admin
// Role-based scoping handled in service layer
// ─────────────────────────────────────────────────────────────

// GET /api/v1/orders
// List orders (scoped by role automatically)
router.get(
  '/',
  authenticate,
  validate({ query: orderQuerySchema }),
  orderController.getAllOrders
);

// GET /api/v1/orders/:id
// Get single order (access verified in service)
router.get(
  '/:id',
  authenticate,
  validateId(),
  orderController.getOrderById
);

// ─────────────────────────────────────────────────────────────
// SELLER ROUTES
// ─────────────────────────────────────────────────────────────

// PATCH /api/v1/orders/:id/status
// Accept or reject an order (seller only)
router.patch(
  '/:id/status',
  authenticate,
  requireRole('seller'),
  validateId(),
  validate({ body: updateOrderStatusSchema }),
  orderController.updateOrderStatus
);

// PATCH /api/v1/orders/:id/ready
// Seller marks order ready + sets final_price (seller only)
// Transition: accepted → ready
router.patch(
  '/:id/ready',
  authenticate,
  requireRole('seller'),
  validateId(),
  validate({ body: markReadySchema }),
  orderController.markReady
);

// PATCH /api/v1/orders/:id/complete
// The order buyer confirms receipt (any authenticated user who is the order's client_id)
// Transition: ready → completed — ownership enforced in service layer
router.patch(
  '/:id/complete',
  authenticate,
  validateId(),
  orderController.confirmComplete
);

module.exports = router;