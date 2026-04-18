'use strict';

const orderService               = require('../services/order.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendPaginated } = require('../utils/response');

// ─────────────────────────────────────────────────────────────
// IMPORTANT — Validation Pattern
// Always use req.validated.body/query — NEVER req.body/req.query
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// CREATE ORDER
// POST /api/v1/orders
// Client only
// ─────────────────────────────────────────────────────────────
const createOrder = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const {
    items,
    delivery_type,
    payment_method,
    client_name,
    client_phone,
    client_address,
    notes,
  } = req.validated.body;

  const order = await orderService.createOrder(
    req.user.id,
    {
      items,
      delivery_type,
      payment_method,
      client_name,
      client_phone,
      client_address,
      notes,
    }
  );

  return sendSuccess(
    res,
    { order },
    'Order placed successfully',
    201
  );
});

// ─────────────────────────────────────────────────────────────
// GET ALL ORDERS
// GET /api/v1/orders
// Scoped by role:
//   client → own orders
//   seller → shop orders
//   admin  → all orders
// ─────────────────────────────────────────────────────────────
const getAllOrders = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }

  const result = await orderService.getAllOrders(
    req.user.id,
    req.user.role,
    req.validated.query
  );

  return sendPaginated(
    res,
    result.orders,
    result.pagination,
    'Orders fetched successfully'
  );
});

// ─────────────────────────────────────────────────────────────
// GET ORDER BY ID
// GET /api/v1/orders/:id
// Client sees own orders
// Seller sees their shop orders
// Admin sees all
// ─────────────────────────────────────────────────────────────
const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(
    req.params.id,
    req.user.id,
    req.user.role
  );

  return sendSuccess(
    res,
    { order },
    'Order fetched successfully',
    200
  );
});

// ─────────────────────────────────────────────────────────────
// UPDATE ORDER STATUS
// PATCH /api/v1/orders/:id/status
// Seller only — accept or reject
// ─────────────────────────────────────────────────────────────
const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { status, rejection_reason } = req.validated.body;

  const order = await orderService.updateOrderStatus(
    req.user.id,
    req.params.id,
    { status, rejection_reason }
  );

  const messages = {
    accepted:  'Order accepted successfully',
    rejected:  'Order rejected successfully',
    completed: 'Order marked as completed',
  };

  return sendSuccess(
    res,
    { order },
    messages[status] || 'Order status updated',
    200
  );
});

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
};