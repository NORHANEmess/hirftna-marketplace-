'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

const isNotFound = (error) =>
  error?.code === 'PGRST116' || error?.code === '406';

// ─────────────────────────────────────────────────────────────
// GET MY NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
const getNotifications = async (userId, query) => {
  const { page = 1, limit = 20 } = query;
  const offset = (page - 1) * limit;

  const { data: notifications, error, count } = await supabaseAdmin
    .from('notifications')
    .select(
      'id, type, title, body, is_read, meta, created_at',
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error({
      message: 'Failed to fetch notifications',
      userId,
      error:   error.message,
    });
    throw new AppError('Failed to fetch notifications', 500);
  }

  return {
    notifications: notifications || [],
    pagination:    { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// GET UNREAD COUNT
// ─────────────────────────────────────────────────────────────
const getUnreadCount = async (userId) => {
  const { count, error } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    logger.error({
      message: 'Failed to get unread count',
      userId,
      error:   error.message,
    });
    throw new AppError('Failed to get unread count', 500);
  }

  return count || 0;
};

// ─────────────────────────────────────────────────────────────
// MARK NOTIFICATION AS READ
// ─────────────────────────────────────────────────────────────
const markAsRead = async (userId, notificationId) => {
  // Verify ownership
  const { data: notif, error: findError } = await supabaseAdmin
    .from('notifications')
    .select('id, user_id, is_read')
    .eq('id', notificationId)
    .single();

  if (findError) {
    if (isNotFound(findError)) {
      throw new AppError('Notification not found', 404);
    }
    throw new AppError('Failed to find notification', 500);
  }

  if (notif.user_id !== userId) {
    throw new AppError('You do not have access to this notification', 403);
  }

  if (notif.is_read) {
    return notif; // Already read — no update needed
  }

  const { data: updated, error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select('id, is_read')
    .single();

  if (error) {
    logger.error({
      message:        'Failed to mark notification as read',
      notificationId,
      userId,
      error:          error.message,
    });
    throw new AppError('Failed to mark notification as read', 500);
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────
// MARK ALL NOTIFICATIONS AS READ
// ─────────────────────────────────────────────────────────────
const markAllAsRead = async (userId) => {
  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    logger.error({
      message: 'Failed to mark all notifications as read',
      userId,
      error:   error.message,
    });
    throw new AppError('Failed to mark all as read', 500);
  }

  logger.info({ message: 'All notifications marked as read', userId });
};

// ─────────────────────────────────────────────────────────────
// DELETE NOTIFICATION
// ─────────────────────────────────────────────────────────────
const deleteNotification = async (userId, notificationId) => {
  const { data: notif, error: findError } = await supabaseAdmin
    .from('notifications')
    .select('id, user_id')
    .eq('id', notificationId)
    .single();

  if (findError) {
    if (isNotFound(findError)) throw new AppError('Notification not found', 404);
    throw new AppError('Failed to find notification', 500);
  }

  if (notif.user_id !== userId) {
    throw new AppError('You do not have access to this notification', 403);
  }

  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    logger.error({
      message:        'Failed to delete notification',
      notificationId,
      error:          error.message,
    });
    throw new AppError('Failed to delete notification', 500);
  }

  logger.info({ message: 'Notification deleted', notificationId, userId });
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};