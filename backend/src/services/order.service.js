'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// FIX M3 M4: ORDER_COLUMNS now includes all custom-order fields
//            and rejection_reason
// ─────────────────────────────────────────────────────────────
const ORDER_COLUMNS = `
  id, status, total_amount, delivery_type,
  payment_method, client_name, client_phone,
  client_address, notes, created_at, updated_at,
  client_id, seller_id,
  budget_min, budget_max, deadline,
  reference_images, rejection_reason, is_custom,
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
      id, name, price, price_min, price_max,
      images:product_images (
        id, image_url, position
      )
    )
  )
`.trim();

// Valid status transitions
const VALID_TRANSITIONS = {
  pending:   ['accepted', 'rejected'],
  accepted:  ['completed'],
  rejected:  [],
  completed: [],
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const isNotFound = (error) =>
  error?.code === 'PGRST116' || error?.code === '406';

// Fire-and-forget — never blocks order creation
const createNotification = async ({ userId, type, title, body, meta }) => {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, type, title, body, meta });

  if (error) {
    logger.error({ message: 'Failed to create notification', userId, type, error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// VALIDATE ORDER ITEMS
//
// FIX M10 — Stock check removed for custom orders.
// This is a custom-order platform. Products don't have stock.
// The only validations needed are:
//   1. Product exists
//   2. Product is active
//   3. All products belong to same seller
//   4. Seller is verified
//
// The stock decrement step is also removed since custom products
// are made-to-order and have no inventory concept.
// ─────────────────────────────────────────────────────────────
const validateOrderItems = async (items) => {
  const productIds = items.map((item) => item.product_id);

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select(`
      id, name, price, is_active, seller_id,
      seller:sellers (id, is_verified)
    `)
    .in('id', productIds);

  if (error) {
    logger.error({ message: 'Failed to fetch products for order validation', error: error.message });
    throw new AppError('Failed to validate order items', 500);
  }

  // All products must exist
  if (!products || products.length !== productIds.length) {
    const foundIds   = (products || []).map((p) => p.id);
    const missingIds = productIds.filter((id) => !foundIds.includes(id));
    throw new AppError(`Products not found: ${missingIds.join(', ')}`, 404);
  }

  // All must be active
  const inactive = products.filter((p) => !p.is_active);
  if (inactive.length > 0) {
    throw new AppError(
      `These products are no longer available: ${inactive.map((p) => p.name).join(', ')}`,
      400
    );
  }

  // All must belong to the same seller
  const sellerIds = [...new Set(products.map((p) => p.seller_id))];
  if (sellerIds.length > 1) {
    throw new AppError('All products in an order must belong to the same seller', 400);
  }

  const sellerId = sellerIds[0];

  // Seller must be verified
  const seller = products[0]?.seller;
  if (!seller?.is_verified) {
    throw new AppError('Cannot place orders from unverified sellers', 400);
  }

  // Build validated items using price as reference price (not charged directly)
  // total_amount is informational — actual price is negotiated for custom orders
  const validatedItems = products.map((product) => {
    const item = items.find((i) => i.product_id === product.id);
    return {
      product_id: product.id,
      quantity:   item.quantity,
      unit_price: product.price, // snapshot reference price
      name:       product.name,
    };
  });

  // total_amount = reference value only (seller sets real price via offer)
  const totalAmount = Math.round(
    validatedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) * 100
  ) / 100;

  return { sellerId, validatedItems, totalAmount };
};

// ─────────────────────────────────────────────────────────────
// CREATE ORDER
// Any authenticated user can place orders (clients AND sellers)
// FIX M3: now inserts budget_min, budget_max, deadline,
//          reference_images, is_custom
// FIX M10: no stock check or stock decrement
// ─────────────────────────────────────────────────────────────
const createOrder = async (clientUser, orderData) => {
  const {
    items,
    delivery_type,
    payment_method,
    client_name,
    client_phone,
    client_address,
    notes,
    // FIX M3 — custom order fields
    budget_min,
    budget_max,
    deadline,
    reference_images,
  } = orderData;

  const clientId = clientUser.id;
  const resolvedClientName = client_name || clientUser.full_name || 'Customer';
  const resolvedClientPhone = client_phone || clientUser.phone || 'Not provided';
  const resolvedClientAddress = client_address || 'Not provided';
  const resolvedNotes = notes || orderData.requirements || null;

  // Step 1 — Validate items (no stock check)
  const { sellerId, validatedItems, totalAmount } = await validateOrderItems(items);

  // Step 2 — Create order with all custom fields
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
        client_id:      clientId,
        seller_id:      sellerId,
        status:         'pending',
        total_amount:   totalAmount,
        delivery_type:    delivery_type || 'hand_to_hand',
        payment_method:   payment_method || 'cash_on_delivery',
        client_name:      resolvedClientName,
        client_phone:     resolvedClientPhone,
        client_address:   resolvedClientAddress,
        notes:            resolvedNotes,
      // FIX M3 — custom order fields now stored in their own columns
      budget_min:       budget_min       ?? null,
      budget_max:       budget_max       ?? null,
      deadline:         deadline         ?? null,
      reference_images: reference_images ?? null,
      is_custom:        true,
    })
    .select('id, status, total_amount, seller_id, client_id')
    .single();

  if (orderError) {
    logger.error({
      message: 'Failed to create order',
      clientId, sellerId,
      error: orderError.message, code: orderError.code,
    });
    throw new AppError('Failed to create order. Please try again.', 500);
  }

  // Step 3 — Create order items
  const orderItemRows = validatedItems.map((item) => ({
    order_id:   order.id,
    product_id: item.product_id,
    quantity:   item.quantity,
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

    // Rollback
    await supabaseAdmin.from('orders').delete().eq('id', order.id);

    throw new AppError('Failed to process order items. Please try again.', 500);
  }

  // NOTE: FIX M10 — NO stock decrement step. Custom orders = made to order.
  // The old  decrement_multiple_product_stock  RPC call has been intentionally
  // removed. Products on this platform have stock: 0 by design.

  // Step 4 — Notify seller (fire and forget)
  const { data: seller, error: sellerLookupError } = await supabaseAdmin
    .from('sellers')
    .select('user_id, shop_name')
    .eq('id', sellerId)
    .single();

  if (sellerLookupError) {
    logger.error({
      message: 'Failed to lookup seller for notification',
      sellerId, orderId: order.id,
      error: sellerLookupError.message,
    });
  }

  if (seller) {
    createNotification({
      userId: seller.user_id,
      type:   'new_order',
      title:  'طلب جديد! 🛍️',
      body:   'لديك طلب مخصص جديد بانتظار مراجعتك',
      meta:   { orderId: order.id, clientId },
    });
  }

  logger.info({
    message: 'Order created',
    orderId: order.id,
    clientId, sellerId,
    total: totalAmount,
    items: validatedItems.length,
  });

  return getOrderById(order.id, clientId, 'client');
};

// ─────────────────────────────────────────────────────────────
// GET ORDER BY ID
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
    logger.error({ message: 'Failed to fetch order', orderId, error: error.message });
    throw new AppError('Failed to fetch order', 500);
  }

  // Access control
  if (role === 'client' && order.client_id !== userId) {
    throw new AppError('You do not have access to this order', 403);
  }

  if (role === 'seller') {
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single();

    // Seller can see orders they received AND orders they placed as a buyer
    if (!seller || (order.seller_id !== seller.id && order.client_id !== userId)) {
      throw new AppError('You do not have access to this order', 403);
    }
  }

  return order;
};

// ─────────────────────────────────────────────────────────────
// GET ALL ORDERS
// Scoped by role:
//   client          → own orders (placed as buyer)
//   seller          → incoming orders to their shop (default)
//   seller?as=client → orders seller placed as a buyer (FIX M9)
//   admin           → all orders
// ─────────────────────────────────────────────────────────────
const getAllOrders = async (userId, role, query) => {
  const { page = 1, limit = 20, status, as } = query;
  const offset = (page - 1) * limit;

  let dbQuery = supabaseAdmin
    .from('orders')
    .select(ORDER_COLUMNS, { count: 'exact' });

  if (role === 'seller' && as === 'client') {
    // FIX M9 — seller viewing orders they placed as a buyer
    dbQuery = dbQuery.eq('client_id', userId);

  } else if (role === 'seller') {
    // Default seller view — incoming orders to their shop
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (seller) {
      dbQuery = dbQuery.eq('seller_id', seller.id);
    }

  } else if (role === 'client') {
    dbQuery = dbQuery.eq('client_id', userId);
  }
  // admin → no filter

  if (status) dbQuery = dbQuery.eq('status', status);

  dbQuery = dbQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: orders, error, count } = await dbQuery;

  if (error) {
    logger.error({ message: 'Failed to fetch orders', userId, role, error: error.message });
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
// FIX M4: rejection_reason now saved in its own column
// ─────────────────────────────────────────────────────────────
const updateOrderStatus = async (userId, orderId, { status, rejection_reason }) => {
  // Get seller profile
  const { data: seller, error: sellerError } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (sellerError || !seller) throw new AppError('Seller profile not found', 404);

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

  if (order.seller_id !== seller.id) {
    throw new AppError('You do not have permission to update this order', 403);
  }

  const allowedTransitions = VALID_TRANSITIONS[order.status] || [];
  if (!allowedTransitions.includes(status)) {
    throw new AppError(
      `Cannot change order status from "${order.status}" to "${status}". ` +
      `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`,
      400
    );
  }

  // FIX M4 — Build update with rejection_reason in its own column
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'rejected' && rejection_reason) {
    updateData.rejection_reason = rejection_reason; // FIX M4 — saved in DB column
  }

  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select(ORDER_COLUMNS)
    .single();

  if (updateError) {
    logger.error({ message: 'Failed to update order status', orderId, status, error: updateError.message });
    throw new AppError('Failed to update order status', 500);
  }

  // Notify client
  const notificationMap = {
    accepted: {
      type:  'order_accepted',
      title: 'تم قبول طلبك! ✅',
      body:  'قبل الحرفي طلبك وسيبدأ العمل قريباً',
    },
    rejected: {
      type:  'order_rejected',
      title: 'تم رفض طلبك ❌',
      body:  rejection_reason
        ? `تم رفض طلبك: ${rejection_reason}`
        : 'تم رفض طلبك من قِبل الحرفي',
    },
    completed: {
      type:  'order_completed',
      title: 'اكتمل طلبك! 🎉',
      body:  'تم الانتهاء من طلبك المخصص',
    },
  };

  const notification = notificationMap[status];
  if (notification) {
    createNotification({
      userId: order.client_id,
      type:   notification.type,
      title:  notification.title,
      body:   notification.body,
      meta: {
        orderId,
        status,
        ...(status === 'rejected' && rejection_reason && { rejection_reason }),
      },
    });
  }

  logger.info({
    message:   'Order status updated',
    orderId,
    oldStatus: order.status,
    newStatus: status,
    sellerId:  seller.id,
  });

  return updatedOrder;
};

module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
