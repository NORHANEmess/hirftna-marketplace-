'use strict';

const notificationService        = require('../services/notification.service');
const { asyncHandler, AppError } = require('../middlewares/error.middleware');
const { sendSuccess, sendCollection } = require('../utils/response');

const getNotifications = asyncHandler(async (req, res) => {
  if (!req.validated?.query) {
    throw new AppError('Query validation not applied', 500);
  }
  const result = await notificationService.getNotifications(
    req.user.id,
    req.validated.query
  );
  return sendCollection(
    res,
    result.notifications,
    result.pagination,
    'Notifications fetched successfully',
    ['notifications']
  );
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  return sendSuccess(res, { unreadCount: count }, 'Unread count fetched', 200);
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.user.id,
    req.validated.params.id
  );
  return sendSuccess(res, { notification }, 'Notification marked as read', 200);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  return sendSuccess(res, null, 'All notifications marked as read', 200);
});

const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.user.id, req.validated.params.id);
  return sendSuccess(res, null, 'Notification deleted', 200);
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
