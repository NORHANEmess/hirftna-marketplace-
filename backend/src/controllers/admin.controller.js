'use strict';

const adminService = require('../services/admin.service');
const { asyncHandler } = require('../middlewares/error.middleware');
const { sendSuccess, sendCollection } = require('../utils/response');

const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, search, category } = req.validated.query;
  const result = await adminService.getProducts({ page, limit, search, category });
  return sendCollection(res, result.products, result.pagination, 'Products fetched successfully', ['products']);
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, search, verified } = req.validated.query;
  const result = await adminService.getUsers({ page, limit, role, search, verified });

  return sendCollection(
    res,
    result.users,
    result.pagination,
    'Users fetched successfully',
    ['users']
  );
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getStats();
  return sendSuccess(res, { stats }, 'Stats fetched successfully');
});

const verifySeller = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { is_verified } = req.validated.body;
  const seller = await adminService.verifySeller(id, is_verified);
  return sendSuccess(res, { seller }, 'Seller verification updated');
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const result = await adminService.deleteProduct(id);
  return sendSuccess(res, result, 'Product deleted successfully');
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { role } = req.validated.body;
  const user = await adminService.updateUserRole(req.user.id, id, role);
  return sendSuccess(res, { user }, 'User role updated successfully');
});

const listPromotions = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.validated.query;
  const result = await adminService.listPromotions({ page, limit, status });
  return sendCollection(res, result.promotions, result.pagination, 'Promotions fetched successfully', ['promotions']);
});

const activatePromotion = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const promotion = await adminService.activatePromotion(id);
  return sendSuccess(res, { promotion }, 'Promotion activated successfully');
});

const rejectPromotion = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { rejection_reason } = req.validated.body;
  const promotion = await adminService.rejectPromotion(id, rejection_reason);
  return sendSuccess(res, { promotion }, 'Promotion rejected');
});

module.exports = { listProducts, listUsers, getStats, verifySeller, deleteProduct, updateUserRole, listPromotions, activatePromotion, rejectPromotion };
