import { useEffect, useState } from 'react';
import {
  Star, CheckCircle2, Clock, XCircle, AlertCircle,
  Megaphone, CalendarCheck, ChevronRight, Loader2, Sparkles, Package,
} from 'lucide-react';
import { promotionsAPI, productsAPI, getApiErrorMessage } from '../../services/api';
import { useTranslation } from '../../i18n/index.jsx';
import DashboardSidebar from '../../components/layout/DashboardSidebar';
import PaymentModal from '../../components/payment/PaymentModal';

const DURATION_OPTIONS = [7, 14, 30];
const PRICE_PER_DAY = 500;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateString, lang) {
  if (!dateString) return '—';
  const locale = lang === 'ar' ? 'ar-DZ' : 'en-GB';
  return new Date(dateString).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function daysLeft(endsAt) {
  if (!endsAt) return null;
  const diff = new Date(endsAt) - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

function elapsedPercent(startsAt, endsAt) {
  if (!startsAt || !endsAt) return 0;
  const total = new Date(endsAt) - new Date(startsAt);
  if (total <= 0) return 100;
  const elapsed = Date.now() - new Date(startsAt);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:  { icon: Clock,          color: 'text-warning',  bg: 'bg-warning/10',  label: 'promotions.status.pending'  },
  active:   { icon: CheckCircle2,   color: 'text-sage-600', bg: 'bg-sage-50',     label: 'promotions.status.active'   },
  expired:  { icon: XCircle,        color: 'text-warm-400', bg: 'bg-cream-200',   label: 'promotions.status.expired'  },
  rejected: { icon: XCircle,        color: 'text-danger',   bg: 'bg-red-50',      label: 'promotions.status.rejected' },
};

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon size={12} />
      {t(cfg.label)}
    </span>
  );
}

// ─── Benefit Row ──────────────────────────────────────────────────────────────
function Benefit({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 text-sm text-warm-700">
      <div className="w-7 h-7 rounded-lg bg-sage-50 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-sage-600" />
      </div>
      {text}
    </div>
  );
}

// ─── Duration Selector ────────────────────────────────────────────────────────
function DurationSelector({ selected, onChange }) {
  const { t } = useTranslation();
  return (
    <div>
      <p className="text-xs font-semibold text-warm-600 mb-2">{t('promotions.chooseDuration')}</p>
      <div className="grid grid-cols-3 gap-2">
        {DURATION_OPTIONS.map((days) => {
          const price = days * PRICE_PER_DAY;
          const isSelected = selected === days;
          return (
            <button
              key={days}
              type="button"
              onClick={() => onChange(days)}
              className={`flex flex-col items-center py-3 px-2 rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-sage-500 bg-sage-50'
                  : 'border-beige-200 bg-white hover:border-sage-300'
              }`}
            >
              <span className={`text-base font-bold ${isSelected ? 'text-sage-700' : 'text-warm-800'}`}>
                {days}
              </span>
              <span className={`text-[10px] font-medium mb-1 ${isSelected ? 'text-sage-600' : 'text-warm-500'}`}>
                {t('common.days')}
              </span>
              <span className={`text-xs font-bold ${isSelected ? 'text-sage-700' : 'text-warm-700'}`}>
                {Number(price).toLocaleString()} DA
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-warm-400 text-center mt-1.5">{t('promotions.pricePerDay')}</p>
    </div>
  );
}

// ─── Active Promotion Countdown ───────────────────────────────────────────────
function ActivePromotionCard({ promotion }) {
  const { t, lang } = useTranslation();
  const remaining = daysLeft(promotion.ends_at);
  const percent   = elapsedPercent(promotion.starts_at, promotion.ends_at);
  const isEndingSoon = remaining !== null && remaining <= 2 && remaining > 0;
  const isExpiredNow = remaining === 0;

  const countdownColor = isEndingSoon
    ? 'text-amber-600'
    : isExpiredNow
      ? 'text-warm-400'
      : 'text-sage-600';

  let countdownText;
  if (isExpiredNow) {
    countdownText = t('promotions.expiredOn', { date: formatDate(promotion.ends_at, lang) });
  } else if (remaining === 1) {
    countdownText = t('promotions.expiresToday');
  } else {
    countdownText = t('promotions.daysRemaining', { days: remaining });
  }

  return (
    <div className="bg-white border border-beige-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-warm-900 text-sm">{t('promotions.currentPromotion')}</p>
        <StatusBadge status="active" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-cream-100 rounded-xl p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-0.5">{t('promotions.starts')}</p>
          <p className="text-sm font-semibold text-warm-800">{formatDate(promotion.starts_at, lang)}</p>
        </div>
        <div className="bg-cream-100 rounded-xl p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-0.5">{t('promotions.expires')}</p>
          <p className="text-sm font-semibold text-warm-800">{formatDate(promotion.ends_at, lang)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 bg-beige-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isEndingSoon ? 'bg-amber-400' : 'bg-sage-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-warm-400">
          <span>{t('promotions.elapsedPercent', { percent })}</span>
          {remaining !== null && (
            <span className={`font-semibold flex items-center gap-1 ${countdownColor}`}>
              <CalendarCheck size={11} />
              {isEndingSoon && !isExpiredNow && `⚠ `}{countdownText}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SellerPromotions() {
  const { t, lang } = useTranslation();

  // Hero/browse promotion state
  const [promotion, setPromotion]   = useState(undefined);
  const [selectedDays, setSelectedDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState(null);
  const [success, setSuccess]       = useState(false);
  const [showPromoPayment, setShowPromoPayment] = useState(false);

  // Product promotion state
  const [myProducts, setMyProducts]               = useState([]);
  const [productPromotions, setProductPromotions] = useState(undefined);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState('featured');
  const [selectedProductDays, setSelectedProductDays] = useState(30);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productError, setProductError]           = useState(null);
  const [showProductPayment, setShowProductPayment] = useState(false);

  function refreshPromotions() {
    promotionsAPI.getMe()
      .then((res) => setPromotion(res.data?.data?.promotion ?? null))
      .catch(() => setPromotion(null));

    promotionsAPI.getMyProductPromotions()
      .then((res) => setProductPromotions(res.data?.data?.promotions ?? []))
      .catch(() => setProductPromotions([]));
  }

  useEffect(() => {
    refreshPromotions();

    productsAPI.getMyProducts({ limit: 50 })
      .then((res) => {
        const items = res.data?.data?.products || res.data?.data?.items || [];
        setMyProducts(items.filter((p) => p.is_active !== false));
      })
      .catch(() => setMyProducts([]));
  }, []);

  async function handleRequest() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await promotionsAPI.request({ placement: 'hero', requested_days: selectedDays });
      setPromotion(res.data?.data?.promotion ?? null);
      setSuccess(true);
      setShowPromoPayment(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProductRequest() {
    if (!selectedProductId) {
      setProductError(t('promotions.boostProduct.selectProductError'));
      return;
    }
    setProductSubmitting(true);
    setProductError(null);
    try {
      await promotionsAPI.request({
        placement: selectedPlacement,
        product_id: selectedProductId,
        requested_days: selectedProductDays,
      });
      setSelectedProductId('');
      const res = await promotionsAPI.getMyProductPromotions();
      setProductPromotions(res.data?.data?.promotions ?? []);
      setShowProductPayment(true);
    } catch (err) {
      setProductError(getApiErrorMessage(err));
    } finally {
      setProductSubmitting(false);
    }
  }

  const isRejected = promotion?.status === 'rejected';
  const isExpired  = promotion?.status === 'expired';
  const canRequest = promotion === null || isExpired || isRejected;

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="seller" />
      <div className="flex-1 pb-28 md:pb-10">
      {/* ── Header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-warm-900">{t('promotions.title')}</h1>
          <p className="text-xs text-warm-400">{t('promotions.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Current Status Card ── */}
        {promotion === undefined ? (
          <div className="h-40 bg-beige-200 rounded-2xl animate-pulse" />
        ) : promotion?.status === 'active' ? (
          <ActivePromotionCard promotion={promotion} />
        ) : promotion?.status === 'pending' ? (
          <div className="bg-warning/10 border border-warning/30 rounded-2xl p-5 flex items-start gap-3">
            <Clock size={18} className="text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-warm-800">{t('promotions.pendingTitle')}</p>
              <p className="text-xs text-warm-500 mt-0.5 leading-relaxed">{t('promotions.pendingBody')}</p>
              <button
                type="button"
                onClick={() => setShowPromoPayment(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-warning hover:bg-amber-600 px-3 py-1.5 rounded-xl transition-colors"
              >
                {t('payment.declare_payment')}
              </button>
            </div>
          </div>
        ) : promotion?.status === 'rejected' ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-danger" />
              <p className="text-sm font-bold text-danger">{t('promotions.rejectedTitle')}</p>
            </div>
            {promotion.rejection_reason && (
              <p className="text-xs text-warm-600 leading-relaxed">{t('promotions.rejectedReason', { reason: promotion.rejection_reason })}</p>
            )}
          </div>
        ) : null}

        {/* ── Boost Card (shown when can request) ── */}
        {canRequest && !success && (
          <div className="bg-white border border-beige-200 rounded-2xl overflow-hidden">
            {/* gradient header */}
            <div className="bg-gradient-to-br from-sage-500 to-sage-700 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Megaphone size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{t('promotions.boostTitle')}</p>
                  <p className="text-xs text-white/70">{t('promotions.boostSubtitle')}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Benefits */}
              <div className="space-y-2.5">
                <Benefit icon={Star}          text={t('promotions.benefit1')} />
                <Benefit icon={CheckCircle2}  text={t('promotions.benefit2')} />
                <Benefit icon={CalendarCheck} text={t('promotions.benefit3')} />
              </div>

              {/* Duration selector */}
              <DurationSelector selected={selectedDays} onChange={setSelectedDays} />

              {/* Price summary */}
              <div className="bg-cream-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-warm-500">{t('promotions.priceLabel')}</p>
                <p className="font-bold text-warm-900 text-sm">
                  {Number(selectedDays * PRICE_PER_DAY).toLocaleString()} DA
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-danger bg-red-50 rounded-xl px-3 py-2">
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              <button
                onClick={handleRequest}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-sage-500 hover:bg-sage-600 disabled:opacity-60 text-white text-sm font-semibold rounded-2xl transition-colors"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                {submitting ? t('common.loading') : (isRejected || isExpired) ? t('promotions.requestAgain') : t('promotions.requestCta')}
              </button>

              <p className="text-[10px] text-warm-400 text-center">{t('promotions.adminNote')}</p>
            </div>
          </div>
        )}

        {/* ── Success confirmation ── */}
        {success && (
          <div className="bg-sage-50 border border-sage-200 rounded-2xl p-5 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-sage-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-sage-800">{t('promotions.successTitle')}</p>
              <p className="text-xs text-sage-600 mt-0.5 leading-relaxed">{t('promotions.successBody')}</p>
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="border-t border-beige-200 pt-4">
          <p className="text-xs font-bold text-warm-500 uppercase tracking-widest mb-3">
            {t('promotions.boostProduct.sectionTitle')}
          </p>
        </div>

        {/* ── Boost a Product Card ── */}
        <div className="bg-white border border-beige-200 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-warm-700 to-warm-900 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{t('promotions.boostProduct.title')}</p>
                <p className="text-xs text-white/70">{t('promotions.boostProduct.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            {myProducts.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-warm-400 py-2">
                <Package size={14} />
                {t('promotions.boostProduct.noProducts')}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-warm-600 mb-1">
                    {t('promotions.boostProduct.selectProduct')}
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-beige-200 bg-cream-50 text-warm-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
                  >
                    <option value="">— {t('promotions.boostProduct.selectPlaceholder')} —</option>
                    {myProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-warm-600 mb-1">
                    {t('promotions.boostProduct.placement')}
                  </label>
                  <div className="flex gap-2">
                    {['featured', 'category_top'].map((pl) => (
                      <button
                        key={pl}
                        type="button"
                        onClick={() => setSelectedPlacement(pl)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                          selectedPlacement === pl
                            ? 'bg-sage-500 text-white border-sage-500'
                            : 'bg-white text-warm-600 border-beige-200 hover:border-sage-300'
                        }`}
                      >
                        {t(`promotions.boostProduct.placements.${pl}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration selector for product boost */}
                <DurationSelector selected={selectedProductDays} onChange={setSelectedProductDays} />

                {/* Price summary */}
                <div className="bg-cream-100 rounded-xl px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-warm-500">{t('promotions.priceLabel')}</p>
                  <p className="font-bold text-warm-900 text-sm">
                    {Number(selectedProductDays * PRICE_PER_DAY).toLocaleString()} DA
                  </p>
                </div>

                {productError && (
                  <div className="flex items-center gap-2 text-xs text-danger bg-red-50 rounded-xl px-3 py-2">
                    <AlertCircle size={13} /> {productError}
                  </div>
                )}
                <button
                  onClick={handleProductRequest}
                  disabled={productSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-warm-800 hover:bg-warm-900 disabled:opacity-60 text-white text-sm font-semibold rounded-2xl transition-colors"
                >
                  {productSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {productSubmitting ? t('common.loading') : t('promotions.boostProduct.cta')}
                </button>

                <p className="text-[10px] text-warm-400 text-center">{t('promotions.adminNote')}</p>
              </>
            )}
          </div>
        </div>

        {/* ── My product promotions list ── */}
        {productPromotions === undefined ? (
          <div className="h-16 bg-beige-200 rounded-2xl animate-pulse" />
        ) : productPromotions.length > 0 ? (
          <div className="bg-white border border-beige-200 rounded-2xl divide-y divide-beige-100">
            {productPromotions.map((pp) => {
              const remaining = daysLeft(pp.ends_at);
              return (
                <div key={pp.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-warm-800 truncate">{pp.product?.name ?? '—'}</p>
                    <p className="text-[10px] text-warm-400 uppercase tracking-wide mt-0.5">{pp.placement}</p>
                    {pp.status === 'active' && remaining !== null && (
                      <p className={`text-[10px] font-semibold mt-0.5 ${remaining <= 2 ? 'text-amber-600' : 'text-sage-600'}`}>
                        {remaining <= 0
                          ? t('promotions.expiredOn', { date: formatDate(pp.ends_at, lang) })
                          : t('promotions.daysRemaining', { days: remaining })}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={pp.status} />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
      </div>

      {showPromoPayment && (
        <PaymentModal
          amount={selectedDays * PRICE_PER_DAY}
          description={`${t('payment.promotion_fee')} — ${selectedDays} ${t('common.days')}`}
          onPaymentDeclared={() => { setShowPromoPayment(false); refreshPromotions(); }}
          onClose={() => setShowPromoPayment(false)}
        />
      )}

      {showProductPayment && (
        <PaymentModal
          amount={selectedProductDays * PRICE_PER_DAY}
          description={`${t('payment.promotion_fee')} — ${selectedProductDays} ${t('common.days')}`}
          onPaymentDeclared={() => { setShowProductPayment(false); refreshPromotions(); }}
          onClose={() => setShowProductPayment(false)}
        />
      )}
    </div>
  );
}
