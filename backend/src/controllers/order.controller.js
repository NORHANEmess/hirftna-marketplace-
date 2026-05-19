'use strict';

const orderService = require('../services/order.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendCollection } = require('../utils/response');
const logger = require('../utils/logger');
const { buildNormalizedOrderInput } = require('../../../shared/schemas/order.schema');

const createOrder = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const payload = buildNormalizedOrderInput(req.validated.body);

  logger.info({
    message: 'Creating order',
    userId: req.user.id,
    orderPreview: {
      product_id: payload.product_id ?? payload.items?.[0]?.product_id ?? null,
      quantity: payload.quantity ?? payload.items?.[0]?.quantity ?? null,
      has_requirements: Boolean(payload.requirements || payload.notes),
    },
  });

  const order = await orderService.createOrder(req.user, payload);
  return sendSuccess(res, { order }, 'Order placed successfully', 201);
});

const getAllOrders = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }

  const result = await orderService.getAllOrders(
    req.user.id,
    req.user.role,
    req.validated.query
  );

  return sendCollection(
    res,
    result.orders,
    result.pagination,
    'Orders fetched successfully',
    ['orders']
  );
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(
    req.params.id,
    req.user.id,
    req.user.role
  );

  return sendSuccess(res, { order }, 'Order fetched successfully', 200);
});

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
    accepted: 'Order accepted successfully',
    rejected: 'Order rejected successfully',
  };

  return sendSuccess(res, { order }, messages[status] || 'Order status updated', 200);
});

// PATCH /api/v1/orders/:id/ready  — seller sets final_price, transitions accepted → ready
const markReady = asyncHandler(async (req, res) => {
  if (!req.validated?.body) {
    throw new AppError('Body validation not applied', 500);
  }

  const { final_price, delivery_type } = req.validated.body;

  const order = await orderService.markReady(
    req.user.id,
    req.params.id,
    { final_price, delivery_type }
  );

  return sendSuccess(res, { order }, 'Order marked as ready. Client has been notified.', 200);
});

// PATCH /api/v1/orders/:id/complete  — client confirms completion, transitions ready → completed
const confirmComplete = asyncHandler(async (req, res) => {
  const order = await orderService.confirmComplete(req.user.id, req.params.id);
  return sendSuccess(res, { order }, 'Order completed successfully. You can now rate each other.', 200);
});

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  markReady,
  confirmComplete,
};
