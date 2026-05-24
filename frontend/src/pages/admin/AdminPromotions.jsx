import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Loader2, Megaphone, XCircle, AlertTriangle,
} from 'lucide-react';
import { adminAPI, resolveApiError } from '../../services/api';
import { useTranslation } from '../../i18n/index.jsx';
import DashboardSidebar from '../../components/layout/DashboardSidebar';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr, lang) {
  if (!dateStr) return '—';
  const locale = lang === 'ar' ? 'ar-DZ' : 'en-GB';
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function daysLeft(endsAt) {
  if (!endsAt) return null;
  const diff = new Date(endsAt) - Date.now();
  return diff > 0 ? Math.ceil(diff / 86400000) : 0;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:  { icon: Clock,        color: 'text-warning',  bg: 'bg-warning/10',  label: 'adminPromotions.status.pending'  },
  active:   { icon: CheckCircle2, color: 'text-sage-600', bg: 'bg-sage-50',     label: 'adminPromotions.status.active'   },
  expired:  { icon: XCircle,      color: 'text-warm-400', bg: 'bg-cream-200',   label: 'adminPromotions.status.expired'  },
  rejected: { icon: XCircle,      color: 'text-danger',   bg: 'bg-red-50',      label: 'adminPromotions.status.rejected' },
};

function StatusBadge({ status }) {
  const { t } = useTranslation();
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon size={11} />
      {t(cfg.label)}
    </span>
  );
}

// ─── Seller Avatar ────────────────────────────────────────────────────────────
function SellerAvatar({ src, name }) {
  const initial = (name || '?')[0].toUpperCase();
  if (src) {
    return <img src={src} alt={name} className="w-10 h-10 rounded-2xl object-cover flex-shrink-0 border border-beige-200" />;
  }
  return (
    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-400 to-sage-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
      {initial}
    </div>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ promotion, onConfirm, onClose, loading }) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-danger" />
          </div>
          <div>
            <p className="font-bold text-warm-900 text-sm">{t('adminPromotions.rejectTitle')}</p>
            <p className="text-xs text-warm-500">{promotion?.seller?.shop_name}</p>
          </div>
        </div>

        <textarea
          className="w-full text-sm border border-beige-200 rounded-xl px-3 py-2.5 outline-none focus:border-sage-400 transition-colors resize-none mb-4"
          rows={3}
          placeholder={t('adminPromotions.rejectReasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border border-beige-200 text-sm font-semibold text-warm-700 hover:bg-cream-100 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!reason.trim() || loading}
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 py-2.5 rounded-2xl bg-danger text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {t('adminPromotions.rejectConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Promotion Card ───────────────────────────────────────────────────────────
function PromotionCard({ promotion, onActivate, onReject, activating, rejecting }) {
  const { t, lang } = useTranslation();
  const seller = promotion.seller;
  const user   = seller?.user;

  return (
    <div className="bg-white border border-beige-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <SellerAvatar src={seller?.avatar_url} name={seller?.shop_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-warm-900 truncate">{seller?.shop_name ?? '—'}</p>
            {seller?.is_verified && <BadgeCheck size={13} className="text-sage-500 flex-shrink-0" />}
            <StatusBadge status={promotion.status} />
          </div>
          {user?.email && <p className="text-[10px] text-warm-400 mt-0.5">{user.email}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-cream-100 rounded-xl py-2 px-1">
          <p className="text-xs font-bold text-warm-800">{promotion.placement}</p>
          <p className="text-[9px] text-warm-400">{t('adminPromotions.placement')}</p>
        </div>
        <div className="bg-cream-100 rounded-xl py-2 px-1">
          <p className="text-xs font-bold text-warm-800">{promotion.requested_days}d</p>
          <p className="text-[9px] text-warm-400">{t('adminPromotions.duration')}</p>
        </div>
        <div className="bg-cream-100 rounded-xl py-2 px-1">
          <p className="text-xs font-bold text-warm-800">{formatDate(promotion.created_at, lang)}</p>
          <p className="text-[9px] text-warm-400">{t('adminPromotions.requested')}</p>
        </div>
      </div>

      {promotion.status === 'active' && promotion.ends_at && (
        <p className="text-xs text-sage-600 font-medium">
          {t('adminPromotions.expiresOn', { date: formatDate(promotion.ends_at, lang) })}
          {daysLeft(promotion.ends_at) !== null && ` ${t('adminPromotions.daysLeft', { days: daysLeft(promotion.ends_at) })}`}
        </p>
      )}

      {promotion.rejection_reason && (
        <p className="text-xs text-danger bg-red-50 rounded-xl px-3 py-2">
          {t('adminPromotions.reason')}: {promotion.rejection_reason}
        </p>
      )}

      {promotion.status === 'pending' && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={activating}
            onClick={() => onActivate(promotion.id)}
            className="flex-1 py-2 rounded-2xl bg-sage-500 hover:bg-sage-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {activating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {t('adminPromotions.activate')}
          </button>
          <button
            type="button"
            disabled={rejecting}
            onClick={() => onReject(promotion)}
            className="flex-1 py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-danger text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            {rejecting ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
            {t('adminPromotions.reject')}
          </button>
        </div>
      )}

      {promotion.status === 'active' && (
        <button
          type="button"
          disabled={rejecting}
          onClick={() => onReject(promotion)}
          className="w-full py-2 rounded-2xl bg-red-50 hover:bg-red-100 text-danger text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {t('adminPromotions.cancelPromotion')}
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'all',      labelKey: 'adminPromotions.tabs.all',      status: undefined   },
  { id: 'pending',  labelKey: 'adminPromotions.tabs.pending',  status: 'pending'   },
  { id: 'active',   labelKey: 'adminPromotions.tabs.active',   status: 'active'    },
  { id: 'expired',  labelKey: 'adminPromotions.tabs.expired',  status: 'expired'   },
];

const PAGE_SIZE = 20;

export default function AdminPromotions() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab]     = useState('all');
  const [promotions, setPromotions]   = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [activatingId, setActivatingId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectingId, setRejectingId]   = useState(null);
  const [error, setError]             = useState(null);

  const currentTab = TABS.find((t) => t.id === activeTab);

  const fetchPromotions = useCallback(async (tab, pg) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.getPromotions({
        page: pg,
        limit: PAGE_SIZE,
        ...(tab.status ? { status: tab.status } : {}),
      });
      const data = res.data?.data;
      setPromotions(data?.promotions ?? []);
      setTotal(data?.pagination?.total ?? 0);
    } catch (err) {
      setError(resolveApiError(err).message);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions(currentTab, page);
  }, [activeTab, page, fetchPromotions, currentTab]);

  async function handleActivate(id) {
    setActivatingId(id);
    try {
      await adminAPI.activatePromotion(id);
      fetchPromotions(currentTab, page);
    } catch (err) {
      setError(resolveApiError(err).message);
    } finally {
      setActivatingId(null);
    }
  }

  async function handleReject(promotion, reason) {
    setRejectingId(promotion.id);
    try {
      await adminAPI.rejectPromotion(promotion.id, reason);
      setRejectTarget(null);
      fetchPromotions(currentTab, page);
    } catch (err) {
      setError(resolveApiError(err).message);
    } finally {
      setRejectingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="admin" />
      <div className="flex-1 pb-28 md:pb-10">
      {/* ── Header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-2xl bg-sage-100 flex items-center justify-center flex-shrink-0">
              <Megaphone size={16} className="text-sage-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-warm-900">{t('adminPromotions.title')}</h1>
              <p className="text-xs text-warm-400">{total} {t('adminPromotions.total')}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-sage-500 text-white'
                    : 'bg-white text-warm-600 border border-beige-200 hover:border-sage-300'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-xs text-danger">{error}</div>
        )}

        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-beige-200 rounded-2xl animate-pulse" />
          ))
        ) : promotions.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone size={28} className="text-warm-300 mx-auto mb-3" />
            <p className="text-warm-500 font-semibold text-sm">{t('adminPromotions.empty')}</p>
            <p className="text-warm-300 text-xs mt-1">{t('adminPromotions.emptySub')}</p>
          </div>
        ) : (
          promotions.map((promo) => (
            <PromotionCard
              key={promo.id}
              promotion={promo}
              onActivate={handleActivate}
              onReject={setRejectTarget}
              activating={activatingId === promo.id}
              rejecting={rejectingId === promo.id}
            />
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-9 h-9 rounded-xl border border-beige-200 bg-white flex items-center justify-center disabled:opacity-40 hover:border-sage-300 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-warm-500 font-medium">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-9 h-9 rounded-xl border border-beige-200 bg-white flex items-center justify-center disabled:opacity-40 hover:border-sage-300 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <RejectModal
          promotion={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => handleReject(rejectTarget, reason)}
          loading={rejectingId === rejectTarget.id}
        />
      )}
      </div>
    </div>
  );
}
