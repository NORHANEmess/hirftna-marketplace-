'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// GET PUBLIC CLIENT PROFILE
// Returns only safe, non-sensitive data about a user.
// Intended for sellers who want to evaluate a client before
// accepting or rejecting a custom order.
//
// Returned fields:
//   • user.id, full_name, avatar_url, created_at  (no email/phone)
//   • stats.completed_orders  (count of completed orders as client)
//   • recent_completed_orders  (last 5, summary only — no prices/addresses)
// ─────────────────────────────────────────────────────────────
const getPublicProfile = async (userId) => {
  // 1. Fetch basic non-sensitive user fields
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, full_name, avatar_url, created_at')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new AppError('User not found', 404);
  }

  // 2. Count completed orders where this user was the client (parallel with step 3)
  const [countResult, ordersResult] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', userId)
      .eq('status', 'completed'),

    // 3. Last 5 completed orders — product name + shop name + date only
    supabaseAdmin
      .from('orders')
      .select(`
        id, completed_at, created_at,
        seller:sellers ( shop_name ),
        items:order_items (
          product:products ( name )
        )
      `)
      .eq('client_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(5),
  ]);

  if (countResult.error) {
    logger.error({ message: 'Failed to count completed orders', userId, error: countResult.error.message });
  }

  const completedOrdersCount = countResult.count ?? 0;

  const recentOrders = (ordersResult.data || []).map((order) => ({
    id:               order.id,
    completed_at:     order.completed_at ?? order.created_at,
    seller_shop_name: order.seller?.shop_name ?? null,
    product_name:     order.items?.[0]?.product?.name ?? null,
  }));

  return {
    user: {
      id:          user.id,
      full_name:   user.full_name,
      avatar_url:  user.avatar_url,
      created_at:  user.created_at,
    },
    stats: {
      completed_orders: completedOrdersCount,
    },
    recent_completed_orders: recentOrders,
  };
};

module.exports = { getPublicProfile };
