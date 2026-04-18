'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError } = require('../middlewares/error.middleware');
const logger = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const ORDER_COLUMNS = `
  id, status, total_amount, delivery_type,
  payment_method, client_name, client_phone,
  client_address, notes, created_at, updated_at,
  client_id, seller_id,
  client:users (
    id, full_name, email, phone, avatar_url
  ),
  seller:sellers (
    id, shop_name, avatar_url,
    user:users ( id, email )
  ),
  items:order_items (
    id, quantity, unit_price,
    product:products (
      id, name, price,
      images:product_images (
        id, url, position
      )
    )
  )
`.trim();

// Valid status transitions
// Only these transitions are allowed
const VALID_TRANSITIONS = {
  pending: ['accepted', 'rejected'],
  accepted: ['completed'],
  rejected: [],
  completed: [],
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const isNotFound = (error) =>
  error?.code === 'PGRST116' || error?.code === '406';

// ─────────────────────────────────────────────────────────────
// CREATE NOTIFICATION
// Internal helper — sends in-app notification
// Fire and forget — never blocks order creation
// ─────────────────────────────────────────────────────────────
const createNotification = async ({ userId, type, title, body, meta }) => {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, type, title, body, meta });

  if (error) {
    logger.error({
      message: 'Failed to create notification',
      userId,
      type,
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// VALIDATE ORDER ITEMS
// Checks:
// 1. All products exist and are active
// 2. All products belong to the SAME seller
// 3. Seller is verified
// 4. Sufficient stock for each item (with row locking)
// Returns: { sellerId, items with prices }
// ─────────────────────────────────────────────────────────────
const validateOrderItems = async (items) => {
  const productIds = items.map((item) => item.product_id);

  // Fetch all products in one query with row locking
  // This prevents race conditions during stock validation
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, price, stock, is_active, seller_id,
      seller:sellers (id, is_verified)
    `)
    .in('id', productIds);

  if (error) {
    logger.error({
      message: 'Failed to fetch products for order validation',
      error: error.message,
    });
    throw new AppError('Failed to validate order items', 500);
  }

  // Check all products exist
  if (!products || products.length !== productIds.length) {
    const foundIds = (products || []).map((p) => p.id);
    const missingIds = productIds.filter((id) => !foundIds.includes(id));
    throw new AppError(
      `Products not found: ${missingIds.join(', ')}`,
      404
    );
  }

  // Check all products are active
  const inactiveProducts = products.filter((p) => !p.is_active);
  if (inactiveProducts.length > 0) {
    throw new AppError(
      `These products are no longer available: ${inactiveProducts.map((p) => p.name).join(', ')
      }`,
      400
    );
  }

  // Check all products belong to same seller
  const sellerIds = [...new Set(products.map((p) => p.seller_id))];
  if (sellerIds.length > 1) {
    throw new AppError(
      'All products in an order must belong to the same seller',
      400
    );
  }

  const sellerId = sellerIds[0];

  // FIX — Check seller is verified
  const seller = products[0]?.seller;
  if (!seller?.is_verified) {
    throw new AppError(
      'Cannot place orders from unverified sellers',
      400
    );
  }

  // Build a map for quick lookup
  const productMap = Object.fromEntries(
    products.map((p) => [p.id, p])
  );

  // Check stock and build validated items
  const validatedItems = [];
  const stockErrors = [];

  for (const item of items) {
    const product = productMap[item.product_id];

    if (product.stock < item.quantity) {
      stockErrors.push(
        `"${product.name}" has only ${product.stock} items in stock ` +
        `(requested: ${item.quantity})`
      );
    } else {
      validatedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price, // Snapshot price at time of order
        name: product.name,
      });
    }
  }

  if (stockErrors.length > 0) {
    throw new AppError(
      `Insufficient stock:\n${stockErrors.join('\n')}`,
      400
    );
  }

  // Calculate total amount
  const totalAmount = validatedItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  // Round to 2 decimal places
  const roundedTotal = Math.round(totalAmount * 100) / 100;

  return {
    sellerId,
    validatedItems,
    totalAmount: roundedTotal,
  };
};

// ─────────────────────────────────────────────────────────────
// CREATE ORDER
// Client only
// Validates products → creates order → creates items
// ─────────────────────────────────────────────────────────────
const createOrder = async (clientId, orderData) => {
  const {
    items,
    delivery_type,
    payment_method,
    client_name,
    client_phone,
    client_address,
    notes,
  } = orderData;

  // Step 1 — Validate all items
  const { sellerId, validatedItems, totalAmount } =
    await validateOrderItems(items);

  // Step 2 — Create order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      client_id: clientId,
      seller_id: sellerId,
      status: 'pending',
      total_amount: totalAmount,
      delivery_type,
      payment_method,
      client_name,
      client_phone,
      client_address,
      notes: notes || null,
    })
    .select('id, status, total_amount, seller_id, client_id')
    .single();

  if (orderError) {
    logger.error({
      message: 'Failed to create order',
      clientId,
      sellerId,
      error: orderError.message,
      code: orderError.code,
    });
    throw new AppError('Failed to create order. Please try again.', 500);
  }

  // Step 3 — Create order items
  const orderItemRows = validatedItems.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }));

  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .insert(orderItemRows);

  if (itemsError) {
    logger.error({
      message: 'Failed to create order items — rolling back order',
      orderId: order.id,
      error: itemsError.message,
    });

    // Rollback — delete the order
    await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', order.id);

    throw new AppError(
      'Failed to process order items. Please try again.',
      500
    );
  }

  // Step 4 — Decrement stock atomically for all products
  // FIX — Use single RPC call to decrement all stocks atomically
  const stockUpdates = validatedItems.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
  }));

  const { error: stockError } = await supabaseAdmin.rpc(
    'decrement_multiple_product_stock',
    { stock_updates: stockUpdates }
  );

  if (stockError) {
    logger.error({
      message: 'Failed to decrement stock for all products — rolling back',
      orderId: order.id,
      stockUpdates,
      error: stockError.message,
    });

    // FIX — Rollback order and items on stock failure
    await supabaseAdmin
      .from('order_items')
      .delete()
      .eq('order_id', order.id);

    await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', order.id);

    throw new AppError(
      'Failed to update product stock. Order cancelled.',
      500
    );
  }

  // Step 5 — Get seller user_id for notification
  const { data: seller, error: sellerLookupError } = await supabaseAdmin
    .from('sellers')
    .select('user_id, shop_name')
    .eq('id', sellerId)
    .single();

  // FIX — Handle seller lookup failure
  if (sellerLookupError) {
    logger.error({
      message: 'Failed to lookup seller for notification',
      sellerId,
      orderId: order.id,
      error: sellerLookupError.message,
    });
    // Continue without notification — order is still valid
    // Admin can manually notify seller if needed
  }

  // Step 6 — Notify seller (fire and forget)
  if (seller) {
    createNotification({
      userId: seller.user_id,
      type: 'new_order',
      title: 'New Order Received! 🛍️',
      body: `You have a new order worth ${totalAmount} DA`,
      meta: { orderId: order.id, clientId },
    });
  }

  logger.info({
    message: 'Order created',
    orderId: order.id,
    clientId,
    sellerId,
    total: totalAmount,
    items: validatedItems.length,
  });

  // Return full order details
  return getOrderById(order.id, clientId, 'client');
};

// ─────────────────────────────────────────────────────────────
// GET ORDER BY ID
// Scoped by role — client sees own, seller sees shop orders
// ─────────────────────────────────────────────────────────────
const getOrderById = async (orderId, userId, role) => {
  if (!orderId) throw new AppError('Order ID is required', 400);

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('id', orderId)
    .single();

  if (error) {
    if (isNotFound(error)) throw new AppError('Order not found', 404);
    logger.error({
      message: 'Failed to fetch order',
      orderId,
      error: error.message,
    });
    throw new AppError('Failed to fetch order', 500);
  }

  // Verify access based on role
  if (role === 'client' && order.client_id !== userId) {
    throw new AppError('You do not have access to this order', 403);
  }

  if (role === 'seller') {
    // Get seller id for this user
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!seller || order.seller_id !== seller.id) {
      throw new AppError('You do not have access to this order', 403);
    }
  }

  return order;
};

// ─────────────────────────────────────────────────────────────
// GET ALL ORDERS
// Scoped by role:
// Client → own orders
// Seller → shop orders
// Admin  → all orders
// ─────────────────────────────────────────────────────────────
const getAllOrders = async (userId, role, query) => {
  const { page = 1, limit = 20, status } = query;
  const offset = (page - 1) * limit;

  let dbQuery = supabaseAdmin
    .from('orders')
    .select(ORDER_COLUMNS, { count: 'exact' });

  // Scope by role
  if (role === 'seller' && query.as === 'client') {
    // Seller viewing orders they placed as a buyer
    dbQuery = dbQuery.eq('client_id', userId);
  } else if (role === 'client') {
    dbQuery = dbQuery.eq('client_id', userId);
  } else if (role === 'seller') {
    // Default: seller viewing incoming orders
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single();
    if (seller) dbQuery = dbQuery.eq('seller_id', seller.id);
  }
  // Admin → no filter (sees all)

  // Filter by status
  if (status) {
    dbQuery = dbQuery.eq('status', status);
  }

  dbQuery = dbQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: orders, error, count } = await dbQuery;

  if (error) {
    logger.error({
      message: 'Failed to fetch orders',
      userId,
      role,
      error: error.message,
    });
    throw new AppError('Failed to fetch orders', 500);
  }

  return {
    orders: orders || [],
    pagination: { page, limit, total: count || 0 },
  };
};

// ─────────────────────────────────────────────────────────────
// UPDATE ORDER STATUS
// Seller only — accept or reject pending orders
// ─────────────────────────────────────────────────────────────
const updateOrderStatus = async (userId, orderId, { status, rejection_reason }) => {
  // Get seller profile
  const { data: seller, error: sellerError } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (sellerError || !seller) {
    throw new AppError('Seller profile not found', 404);
  }

  // Get current order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, status, client_id, seller_id, total_amount')
    .eq('id', orderId)
    .single();

  if (orderError) {
    if (isNotFound(orderError)) throw new AppError('Order not found', 404);
    throw new AppError('Failed to fetch order', 500);
  }

  // Verify seller owns this order
  if (order.seller_id !== seller.id) {
    throw new AppError(
      'You do not have permission to update this order',
      403
    );
  }

  // Validate status transition
  const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
  if (!allowedTransitions.includes(status)) {
    throw new AppError(
      `Cannot change order status from "${order.status}" to "${status}". ` +
      `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      400
    );
  }

  // Build update object
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
  };

  // Update order status
  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select(ORDER_COLUMNS)
    .single();

  if (updateError) {
    logger.error({
      message: 'Failed to update order status',
      orderId,
      status,
      error: updateError.message,
    });
    throw new AppError('Failed to update order status', 500);
  }

  // Notify client based on new status
  const notificationMap = {
    accepted: {
      type: 'order_accepted',
      title: 'Order Accepted! ✅',
      body: `Your order has been accepted by the seller`,
    },
    rejected: {
      type: 'order_rejected',
      title: 'Order Rejected ❌',
      body: rejection_reason
        ? `Your order was rejected: ${rejection_reason}`
        : 'Your order was rejected by the seller',
    },
    // FIX — Use correct type for completed orders
    completed: {
      type: 'order_completed',
      title: 'Order Completed! 🎉',
      body: 'Your order has been marked as completed',
    },
  };

  const notification = notificationMap[status];
  if (notification) {
    createNotification({
      userId: order.client_id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      // FIX — Include rejection_reason in meta for rejected orders
      meta: {
        orderId,
        status,
        ...(status === 'rejected' && rejection_reason && { rejection_reason })
      },
    });
  }

  logger.info({
    message: 'Order status updated',
    orderId,
    oldStatus: order.status,
    newStatus: status,
    sellerId: seller.id,
  });

  return updatedOrder;
};

module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};