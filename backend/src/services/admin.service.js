'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

const isNotFound = (error) => error?.code === 'PGRST116';

// ─────────────────────────────────────────────────────────────
// LIST USERS
// Paginated list with enriched seller/client data.
// verified='true'|'false' — pre-filters by seller verification status.
// ─────────────────────────────────────────────────────────────
const getUsers = async ({ page = 1, limit = 20, role, search, verified } = {}) => {
  const offset = (page - 1) * limit;

  // Pre-filter by seller verification when requested
  let userIdFilter = null;
  if (verified !== undefined && verified !== null && verified !== '') {
    const isVerified = verified === 'true' || verified === true;
    const { data: filteredSellers, error: filterErr } = await supabaseAdmin
      .from('sellers')
      .select('user_id')
      .eq('is_verified', isVerified);
    if (filterErr) {
      logger.error({ message: 'Admin: pre-filter sellers by verification failed', error: filterErr.message });
    }
    userIdFilter = (filteredSellers || []).map((s) => s.user_id);
    if (userIdFilter.length === 0) {
      return { users: [], pagination: { page, limit, total: 0 } };
    }
  }

  let query = supabaseAdmin
    .from('users')
    .select(
      `
        id, email, full_name, role, avatar_url, created_at,
        seller:sellers (
          id, shop_name, is_verified, avg_rating, location, city,
          description, bio, avatar_url, admin_override,
          category:categories!category_id ( id, name )
        )
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (role) query = query.eq('role', role);
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  if (userIdFilter !== null) query = query.in('id', userIdFilter);

  const { data: users, error, count } = await query;

  if (error) {
    logger.error({ message: 'Admin: failed to fetch users', error: error.message });
    throw new AppError('Failed to fetch users', 500);
  }

  if (!users || users.length === 0) {
    return { users: [], pagination: { page, limit, total: count || 0 } };
  }

  // Batch-enrich with counts (avoids N+1)
  const sellerIds = users.filter((u) => u.seller?.id).map((u) => u.seller.id);
  const userIds   = users.map((u) => u.id);

  const [productCountsRes, sellerOrdersRes, clientOrdersRes, clientRatingsRes] = await Promise.all([
    sellerIds.length
      ? supabaseAdmin.from('products').select('seller_id').eq('is_active', true).in('seller_id', sellerIds)
      : { data: [] },
    sellerIds.length
      ? supabaseAdmin.from('orders').select('seller_id').eq('status', 'completed').in('seller_id', sellerIds)
      : { data: [] },
    userIds.length
      ? supabaseAdmin.from('orders').select('client_id, status').in('client_id', userIds)
      : { data: [] },
    userIds.length
      ? supabaseAdmin.from('client_ratings').select('client_id, rating').in('client_id', userIds)
      : { data: [] },
  ]);

  const activeProductCounts = {};
  (productCountsRes.data || []).forEach((p) => {
    activeProductCounts[p.seller_id] = (activeProductCounts[p.seller_id] || 0) + 1;
  });

  const sellerCompletedCounts = {};
  (sellerOrdersRes.data || []).forEach((o) => {
    sellerCompletedCounts[o.seller_id] = (sellerCompletedCounts[o.seller_id] || 0) + 1;
  });

  const clientOrderCounts     = {};
  const clientCompletedCounts = {};
  (clientOrdersRes.data || []).forEach((o) => {
    clientOrderCounts[o.client_id] = (clientOrderCounts[o.client_id] || 0) + 1;
    if (o.status === 'completed') {
      clientCompletedCounts[o.client_id] = (clientCompletedCounts[o.client_id] || 0) + 1;
    }
  });

  const clientRatingMap = {};
  (clientRatingsRes.data || []).forEach((r) => {
    if (!clientRatingMap[r.client_id]) clientRatingMap[r.client_id] = [];
    clientRatingMap[r.client_id].push(Number(r.rating));
  });

  const enrichedUsers = users.map((user) => {
    const enriched = { ...user };

    if (user.seller) {
      enriched.seller = {
        ...user.seller,
        active_product_count:  activeProductCounts[user.seller.id] || 0,
        completed_order_count: sellerCompletedCounts[user.seller.id] || 0,
      };
    }

    const ratings = clientRatingMap[user.id] || [];
    enriched.client_stats = {
      order_count:           clientOrderCounts[user.id] || 0,
      completed_order_count: clientCompletedCounts[user.id] || 0,
      avg_rating: ratings.length
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : null,
    };

    return enriched;
  });

  return {
    users: enrichedUsers,
    pagination: { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// PLATFORM STATS
// Aggregated metrics for the admin dashboard
// ─────────────────────────────────────────────────────────────
const getStats = async () => {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    usersTotalResult,
    usersClientResult,
    usersSellerResult,
    productsTotalResult,
    productsActiveResult,
    ordersPendingResult,
    ordersAcceptedResult,
    ordersRejectedResult,
    ordersReadyResult,
    ordersCompletedResult,
    revenueResult,
    reviewsResult,
    newUsersResult,
    newOrdersResult,
    topSellersResult,
    topProductsResult,
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'client'),
    supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'ready'),
    supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),

    // Revenue from completed orders (needs actual values)
    supabaseAdmin
      .from('orders')
      .select('final_price')
      .eq('status', 'completed')
      .not('final_price', 'is', null),

    // Total reviews
    supabaseAdmin.from('reviews').select('id', { count: 'exact', head: true }),

    // New users this month
    supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart),

    // New orders this month
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart),

    // Top 5 sellers by completed orders
    supabaseAdmin
      .from('orders')
      .select('seller_id, seller:sellers!seller_id ( id, shop_name, avg_rating )')
      .eq('status', 'completed'),

    // Top 5 products by avg_rating
    supabaseAdmin
      .from('products')
      .select('id, name, avg_rating, seller:sellers!seller_id ( shop_name )')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })
      .limit(5),
  ]);

  const usersTotal = usersTotalResult.count || 0;
  const usersClient = usersClientResult.count || 0;
  const usersSeller = usersSellerResult.count || 0;
  const usersByRole = {
    client: usersClient,
    seller: usersSeller,
    admin: Math.max(0, usersTotal - usersClient - usersSeller),
  };

  const productsTotal = productsTotalResult.count || 0;
  const productsActive = productsActiveResult.count || 0;
  const products = {
    total: productsTotal,
    active: productsActive,
    inactive: productsTotal - productsActive,
  };

  const ordersByStatus = {
    pending:   ordersPendingResult.count   || 0,
    accepted:  ordersAcceptedResult.count  || 0,
    rejected:  ordersRejectedResult.count  || 0,
    ready:     ordersReadyResult.count     || 0,
    completed: ordersCompletedResult.count || 0,
  };
  const ordersTotal = Object.values(ordersByStatus).reduce((a, b) => a + b, 0);

  // Total revenue
  const totalRevenue = (revenueResult.data || []).reduce(
    (sum, o) => sum + (Number(o.final_price) || 0),
    0
  );

  // Top 5 sellers by completed order count
  const sellerOrderCounts = {};
  const sellerMeta = {};
  (topSellersResult.data || []).forEach((o) => {
    const sid = o.seller_id;
    sellerOrderCounts[sid] = (sellerOrderCounts[sid] || 0) + 1;
    if (!sellerMeta[sid] && o.seller) sellerMeta[sid] = o.seller;
  });

  const topSellers = Object.entries(sellerOrderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sellerId, completedOrders]) => ({
      seller_id: sellerId,
      shop_name: sellerMeta[sellerId]?.shop_name || 'Unknown',
      avg_rating: sellerMeta[sellerId]?.avg_rating || 0,
      completed_orders: completedOrders,
    }));

  const topProducts = (topProductsResult.data || []).map((p) => ({
    id: p.id,
    name: p.name,
    avg_rating: p.avg_rating || 0,
    seller_name: p.seller?.shop_name || 'Unknown',
  }));

  return {
    users: {
      total: usersTotal,
      byRole: usersByRole,
    },
    products,
    orders: {
      total: ordersTotal,
      byStatus: ordersByStatus,
    },
    revenue: {
      total: totalRevenue,
      currency: 'DA',
    },
    reviews: {
      total: reviewsResult.count || 0,
    },
    thisMonth: {
      newUsers: newUsersResult.count || 0,
      newOrders: newOrdersResult.count || 0,
    },
    topSellers,
    topProducts,
  };
};

// ─────────────────────────────────────────────────────────────
// VERIFY SELLER
// Admin sets sellers.is_verified = true/false
// Also sets admin_override so auto-verification won't revert the decision.
// Pass is_verified = null to clear the override and let auto-verification resume.
// ─────────────────────────────────────────────────────────────
const verifySeller = async (sellerId, isVerified) => {
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .update({
      is_verified:    isVerified,
      admin_override: isVerified, // locks the status from auto-reversion
      updated_at:     new Date().toISOString(),
    })
    .eq('id', sellerId)
    .select('id, shop_name, is_verified, user_id')
    .single();

  if (error) {
    if (isNotFound(error)) throw new AppError('Seller not found', 404);
    logger.error({ message: 'Admin: failed to verify seller', sellerId, error: error.message });
    throw new AppError('Failed to update seller verification', 500);
  }

  if (!data) throw new AppError('Seller not found', 404);

  logger.info({ message: 'Admin: seller verification updated', sellerId, isVerified });

  // Notify the seller of the admin decision
  if (data.user_id) {
    const notifType = isVerified === true ? 'seller_verified' : 'system';
    await supabaseAdmin.from('notifications').insert({
      user_id: data.user_id,
      type:    notifType,
      title:   notifType,
      body:    null,
      meta:    isVerified === true
        ? { shopName: data.shop_name }
        : { sellerId, isVerified, adminAction: true },
    }).catch((notifErr) => {
      logger.error({ message: 'Failed to send verification notification', sellerId, error: notifErr.message });
    });
  }

  return { id: data.id, shop_name: data.shop_name, is_verified: data.is_verified };
};

// ─────────────────────────────────────────────────────────────
// DELETE PRODUCT (admin force-delete)
// Must remove related records first to avoid FK constraint violations:
// product_images, wishlist, reviews, browsing_events, promotions, order_items all reference product_id
// ─────────────────────────────────────────────────────────────
const deleteProduct = async (productId) => {
  const { data: product, error: findError } = await supabaseAdmin
    .from('products')
    .select('id, name, seller_id')
    .eq('id', productId)
    .single();

  if (findError || !product) throw new AppError('Product not found', 404);

  // Delete all child records in parallel — each has a FK on product_id
  const cleanups = await Promise.all([
    supabaseAdmin.from('browsing_events').delete().eq('product_id', productId),
    supabaseAdmin.from('reviews').delete().eq('product_id', productId),
    supabaseAdmin.from('wishlist').delete().eq('product_id', productId),
    supabaseAdmin.from('product_images').delete().eq('product_id', productId),
    supabaseAdmin.from('promotions').delete().eq('product_id', productId),
    supabaseAdmin.from('order_items').delete().eq('product_id', productId),
  ]);

  for (const { error: cleanupErr } of cleanups) {
    if (cleanupErr) {
      logger.warn({ message: 'Admin: cleanup step failed during product delete', productId, error: cleanupErr.message });
    }
  }

  const { error } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    logger.error({ message: 'Admin: failed to delete product', productId, error: error.message });
    throw new AppError('Failed to delete product', 500);
  }

  logger.info({ message: 'Admin: product deleted', productId, productName: product.name });

  return { deleted: true, product };
};

// ─────────────────────────────────────────────────────────────
// UPDATE USER ROLE
// Cannot set role to 'admin' via API — only direct DB
// Cannot change own role
// ─────────────────────────────────────────────────────────────
const updateUserRole = async (adminId, userId, newRole) => {
  if (adminId === userId) {
    throw new AppError('You cannot change your own role', 400);
  }

  if (newRole === 'admin') {
    throw new AppError('Cannot assign admin role via API', 403);
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)
    .select('id, email, full_name, role')
    .single();

  if (error) {
    if (isNotFound(error)) throw new AppError('User not found', 404);
    logger.error({ message: 'Admin: failed to update user role', userId, newRole, error: error.message });
    throw new AppError('Failed to update user role', 500);
  }

  if (!data) throw new AppError('User not found', 404);

  logger.info({ message: 'Admin: user role updated', userId, newRole });

  return data;
};

// ─────────────────────────────────────────────────────────────
// LIST PRODUCTS (admin — all products, active + inactive)
// ─────────────────────────────────────────────────────────────
const getProducts = async ({ page = 1, limit = 20, search, category } = {}) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('products')
    .select(
      `id, name, price, price_min, price_max, is_active, created_at,
       cover:product_images ( image_url, position ),
       seller:sellers!seller_id ( id, shop_name )`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) query = query.ilike('name', `%${search}%`);
  if (category) query = query.eq('category_id', category);

  const { data: products, error, count } = await query;

  if (error) {
    logger.error({ message: 'Admin: failed to fetch products', error: error.message });
    throw new AppError('Failed to fetch products', 500);
  }

  return {
    products: products || [],
    pagination: { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// LIST PROMOTIONS (admin)
// ─────────────────────────────────────────────────────────────
const listPromotions = async ({ page = 1, limit = 20, status } = {}) => {
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('promotions')
    .select(
      `
        id, placement, requested_days, status,
        starts_at, ends_at, rejection_reason, created_at,
        seller:sellers!seller_id (
          id, shop_name, avatar_url,
          user:users!user_id ( full_name, email )
        )
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data: promotions, error, count } = await query;

  if (error) {
    logger.error({ message: 'Admin: failed to fetch promotions', error: error.message });
    throw new AppError('Failed to fetch promotions', 500);
  }

  return {
    promotions: promotions || [],
    pagination:  { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// ACTIVATE PROMOTION (admin)
// Sets status=active, is_active=true, starts_at=now, ends_at=now+requested_days
// ─────────────────────────────────────────────────────────────
const activatePromotion = async (promotionId) => {
  const { data: existing, error: findError } = await supabaseAdmin
    .from('promotions')
    .select('id, status, placement, requested_days, seller_id, seller:sellers!seller_id ( user_id, shop_name )')
    .eq('id', promotionId)
    .single();

  if (findError || !existing) throw new AppError('Promotion not found', 404);
  if (existing.status === 'active') throw new AppError('Promotion is already active', 400);

  const now = new Date();
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + (existing.requested_days || 7));

  const { data, error } = await supabaseAdmin
    .from('promotions')
    .update({
      status:    'active',
      is_active:  true,
      starts_at:  now.toISOString(),
      ends_at:    endsAt.toISOString(),
    })
    .eq('id', promotionId)
    .select('id, status, starts_at, ends_at')
    .single();

  if (error) {
    logger.error({ message: 'Admin: failed to activate promotion', promotionId, error: error.message });
    throw new AppError('Failed to activate promotion', 500);
  }

  const userId = existing.seller?.user_id;
  if (userId) {
    supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type:    'promotion_activated',
      title:   'promotion_activated',
      body:    null,
      meta:    { shopName: existing.seller?.shop_name, days: existing.requested_days, placement: existing.placement },
    }).then(({ error: notifError }) => {
      if (notifError) logger.error({ message: 'Admin: promotion activation notification failed', error: notifError.message });
    });
  }

  logger.info({ message: 'Admin: promotion activated', promotionId });
  return data;
};

// ─────────────────────────────────────────────────────────────
// REJECT PROMOTION (admin)
// Sets status=rejected, is_active=false, stores rejection_reason
// ─────────────────────────────────────────────────────────────
const rejectPromotion = async (promotionId, rejection_reason) => {
  const { data: existing, error: findError } = await supabaseAdmin
    .from('promotions')
    .select('id, status, placement, seller_id, seller:sellers!seller_id ( user_id, shop_name )')
    .eq('id', promotionId)
    .single();

  if (findError || !existing) throw new AppError('Promotion not found', 404);
  if (existing.status === 'rejected') throw new AppError('Promotion is already rejected', 400);

  const { data, error } = await supabaseAdmin
    .from('promotions')
    .update({
      status:           'rejected',
      is_active:         false,
      rejection_reason,
    })
    .eq('id', promotionId)
    .select('id, status, rejection_reason')
    .single();

  if (error) {
    logger.error({ message: 'Admin: failed to reject promotion', promotionId, error: error.message });
    throw new AppError('Failed to reject promotion', 500);
  }

  const userId = existing.seller?.user_id;
  if (userId) {
    supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type:    'promotion_rejected',
      title:   'promotion_rejected',
      body:    null,
      meta:    { shopName: existing.seller?.shop_name, rejectionReason: rejection_reason, placement: existing.placement },
    }).then(({ error: notifError }) => {
      if (notifError) logger.error({ message: 'Admin: promotion rejection notification failed', error: notifError.message });
    });
  }

  logger.info({ message: 'Admin: promotion rejected', promotionId });
  return data;
};

module.exports = { getUsers, getProducts, getStats, verifySeller, deleteProduct, updateUserRole, listPromotions, activatePromotion, rejectPromotion };
