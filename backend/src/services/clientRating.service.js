'use strict';

const { supabaseAdmin } = require('../config/supabase');
const { AppError }      = require('../middlewares/error.middleware');
const logger            = require('../utils/logger');

// ─────────────────────────────────────────────────────────────
// CREATE CLIENT RATING
// Seller rates a client after order is COMPLETED.
// Business rules:
//   • Only the seller of that order can rate
//   • Order must be in 'completed' status
//   • One rating per order per seller (DB UNIQUE constraint enforces this)
// ─────────────────────────────────────────────────────────────
const createClientRating = async (userId, { order_id, rating, comment }) => {
  // Resolve the seller profile from the authenticated user
  const { data: seller, error: sellerError } = await supabaseAdmin
    .from('sellers')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (sellerError || !seller) {
    throw new AppError('Only sellers can rate clients', 403);
  }

  // Fetch the order to validate ownership and status
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, status, seller_id, client_id')
    .eq('id', order_id)
    .single();

  if (orderError || !order) {
    throw new AppError('Order not found', 404);
  }

  // Seller must own this order
  if (order.seller_id !== seller.id) {
    throw new AppError('You can only rate clients from your own orders', 403);
  }

  const client_id = order.client_id;

  // Rating only allowed after completion
  if (order.status !== 'completed') {
    throw new AppError(
      `You can only rate a client after the order is completed. Current status: "${order.status}"`,
      400
    );
  }

  // Insert — DB UNIQUE (order_id, seller_id) prevents duplicates
  const { data: clientRating, error: insertError } = await supabaseAdmin
    .from('client_ratings')
    .insert({
      order_id,
      seller_id:  seller.id,
      client_id,
      rating,
      comment: comment ?? null,
    })
    .select('id, order_id, seller_id, client_id, rating, comment, created_at')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      throw new AppError('You have already rated this client for this order', 409);
    }
    // Log full Supabase error details to make DB constraint issues visible
    logger.error({
      message:   'Failed to create client rating',
      order_id,
      seller_id: seller.id,
      client_id,
      supabase_code:    insertError.code,
      supabase_message: insertError.message,
      supabase_details: insertError.details,
      supabase_hint:    insertError.hint,
    });
    throw new AppError(`Failed to submit client rating: ${insertError.message}`, 500);
  }

  logger.info({ message: 'Client rated', orderId: order_id, sellerId: seller.id, clientId: client_id, rating });

  return clientRating;
};

// ─────────────────────────────────────────────────────────────
// GET RATINGS FOR A CLIENT
// Public — anyone can view how a client has been rated by sellers
// ─────────────────────────────────────────────────────────────
const getClientRatings = async (clientId, { page = 1, limit = 20 } = {}) => {
  const offset = (page - 1) * limit;

  const [paginatedResult, allRatingsResult] = await Promise.all([
    supabaseAdmin
      .from('client_ratings')
      .select(
        `
          id, rating, comment, created_at,
          seller:sellers (
            id, shop_name, avatar_url
          ),
          order:orders (
            id, created_at
          )
        `,
        { count: 'exact' }
      )
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1),
    supabaseAdmin
      .from('client_ratings')
      .select('rating')
      .eq('client_id', clientId),
  ]);

  if (paginatedResult.error) {
    logger.error({ message: 'Failed to fetch client ratings', clientId, error: paginatedResult.error.message });
    throw new AppError('Failed to fetch client ratings', 500);
  }

  let avgRating = 0;
  if (allRatingsResult.data?.length) {
    const sum = allRatingsResult.data.reduce((acc, r) => acc + r.rating, 0);
    avgRating = Math.round((sum / allRatingsResult.data.length) * 10) / 10;
  }

  return {
    ratings: paginatedResult.data || [],
    avgRating,
    pagination: { page, limit, total: paginatedResult.count || 0 },
  };
};

module.exports = {
  createClientRating,
  getClientRatings,
};
