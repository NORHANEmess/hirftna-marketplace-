'use strict';

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../utils/logger');

const THRESHOLDS = {
  MIN_ACTIVE_PRODUCTS:  1,
  MIN_COMPLETED_ORDERS: 3,
  MIN_AVG_RATING:       4.0,
};

// ─────────────────────────────────────────────────────────────
// CHECK ELIGIBILITY
// Returns criteria breakdown + whether seller qualifies
// ─────────────────────────────────────────────────────────────
const checkVerificationEligibility = async (sellerId) => {
  const [sellerResult, activeProductsResult, completedOrdersResult] = await Promise.all([
    supabaseAdmin
      .from('sellers')
      .select('id, shop_name, description, bio, avatar_url, location, city, avg_rating, is_verified, admin_override, user_id')
      .eq('id', sellerId)
      .single(),
    supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('is_active', true),
    supabaseAdmin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .eq('status', 'completed'),
  ]);

  if (sellerResult.error || !sellerResult.data) {
    throw new Error(`Seller ${sellerId} not found during verification check`);
  }

  const seller         = sellerResult.data;
  const activeProducts = activeProductsResult.count ?? 0;
  const completedOrders = completedOrdersResult.count ?? 0;
  const avgRating      = parseFloat(seller.avg_rating) || 0;

  const hasCompleteProfile = Boolean(
    seller.shop_name &&
    (seller.description || seller.bio) &&
    seller.avatar_url &&
    (seller.location || seller.city)
  );

  const criteria = [
    {
      key:      'activeProducts',
      met:      activeProducts >= THRESHOLDS.MIN_ACTIVE_PRODUCTS,
      current:  activeProducts,
      required: THRESHOLDS.MIN_ACTIVE_PRODUCTS,
    },
    {
      key:      'completedOrders',
      met:      completedOrders >= THRESHOLDS.MIN_COMPLETED_ORDERS,
      current:  completedOrders,
      required: THRESHOLDS.MIN_COMPLETED_ORDERS,
    },
    {
      key:      'avgRating',
      met:      avgRating >= THRESHOLDS.MIN_AVG_RATING,
      current:  avgRating,
      required: THRESHOLDS.MIN_AVG_RATING,
    },
    {
      key:      'completeProfile',
      met:      hasCompleteProfile,
      current:  hasCompleteProfile ? 1 : 0,
      required: 1,
    },
  ];

  const isEligible = criteria.every((c) => c.met);

  return {
    isEligible,
    isVerified:    seller.is_verified,
    adminOverride: seller.admin_override,
    userId:        seller.user_id,
    criteria,
  };
};

// ─────────────────────────────────────────────────────────────
// UPDATE VERIFICATION STATUS
// Fire-and-forget safe — never throws, logs errors only.
// No-op when admin_override is set (admin decision takes precedence).
// ─────────────────────────────────────────────────────────────
const updateVerificationStatus = async (sellerId) => {
  try {
    const { isEligible, isVerified, adminOverride, userId } =
      await checkVerificationEligibility(sellerId);

    // Admin has locked the status — do not override
    if (adminOverride !== null && adminOverride !== undefined) return;

    // No change needed
    if (isEligible === isVerified) return;

    const { error } = await supabaseAdmin
      .from('sellers')
      .update({ is_verified: isEligible, updated_at: new Date().toISOString() })
      .eq('id', sellerId);

    if (error) {
      logger.error({ message: 'Failed to auto-update seller verification', sellerId, error: error.message });
      return;
    }

    logger.info({ message: `Seller verification auto-updated to ${isEligible}`, sellerId });

    if (userId) {
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        type:    'system',
        title:   isEligible ? '🎉 تم التحقق من متجرك!' : '⚠️ تم إلغاء تحقق متجرك',
        body:    isEligible
          ? 'لقد استوفيت جميع معايير التحقق. أصبح متجرك الآن موثقاً.'
          : 'لم تعد تستوفي معايير التحقق. يمكنك استعادة الشارة بإتمام الشروط.',
        meta:    { sellerId, isVerified: isEligible, autoTriggered: true },
      });
    }
  } catch (err) {
    logger.error({ message: 'Verification check error (non-fatal)', sellerId, error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET VERIFICATION STATUS
// Returns full criteria breakdown for the seller dashboard UI
// ─────────────────────────────────────────────────────────────
const getVerificationStatus = async (sellerId) => {
  const { isEligible, isVerified, adminOverride, criteria } =
    await checkVerificationEligibility(sellerId);
  return { isEligible, isVerified, adminOverride, criteria };
};

module.exports = { updateVerificationStatus, getVerificationStatus };
