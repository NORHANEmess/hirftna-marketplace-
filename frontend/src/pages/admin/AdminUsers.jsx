import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  BadgeCheck,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Store,
  Star,
  MapPin,
  Tag,
  ExternalLink,
  AlertTriangle,
  Users,
  Clock,
  ShoppingBag,
  Package,
  UserCheck,
} from 'lucide-react';
import { adminAPI, resolveApiError } from '../../services/api';
import { useTranslation } from '../../i18n/index.jsx';
import DashboardSidebar from '../../components/layout/DashboardSidebar';

function normalizeWilayaKey(location) {
  if (!location) return '';
  return location.toLowerCase().trim()
    .replace(/\s+/g, '_')
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
    .replace(/[ïî]/g, 'i').replace(/[ûùü]/g, 'u').replace(/[ôö]/g, 'o');
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'all',               labelKey: 'adminUsers.tabs.all',               role: '',       verified: undefined },
  { id: 'clients',           labelKey: 'adminUsers.tabs.clients',           role: 'client', verified: undefined },
  { id: 'sellers',           labelKey: 'adminUsers.tabs.sellers',           role: 'seller', verified: undefined },
  { id: 'unverifiedSellers', labelKey: 'adminUsers.tabs.unverifiedSellers', role: 'seller', verified: 'false'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatJoinDate(dateStr, lang = 'en') {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function verificationScore(seller) {
  if (!seller) return { met: 0, total: 4 };
  const criteria = [
    (seller.active_product_count || 0) >= 1,
    (seller.completed_order_count || 0) >= 3,
    parseFloat(seller.avg_rating || 0) >= 4.0,
    Boolean(seller.shop_name && (seller.description || seller.bio) && seller.avatar_url && (seller.location || seller.city)),
  ];
  return { met: criteria.filter(Boolean).length, total: criteria.length };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({ src, name }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-11 h-11 rounded-2xl object-cover flex-shrink-0 border border-beige-200"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sage-400 to-sage-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  );
}

function RolePill({ role }) {
  const map = {
    client: 'bg-blue-50 text-blue-700 border-blue-100',
    seller: 'bg-sage-50 text-sage-700 border-sage-100',
    admin:  'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${map[role] || 'bg-beige-100 text-warm-600 border-beige-200'}`}>
      {role}
    </span>
  );
}

function VerifiedPill() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sage-50 border border-sage-200 text-sage-700 rounded-full text-[10px] font-semibold">
      <BadgeCheck size={10} className="text-sage-600" />
      {t('adminUsers.verifiedLabel')}
    </span>
  );
}

function UnverifiedPill({ score }) {
  const { t } = useTranslation();
  const pct = Math.round((score.met / score.total) * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-[10px] font-semibold w-fit">
        <Clock size={9} />
        {t('adminUsers.unverifiedLabel')}
      </span>
      <div className="flex items-center gap-1.5 pl-0.5">
        <div className="h-1 w-14 bg-beige-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[9px] text-warm-400 tabular-nums">{score.met}/{score.total}</span>
      </div>
    </div>
  );
}

function StatMini({ icon: Icon, value, label }) {
  return (
    <div className="flex flex-col items-center bg-cream-100 rounded-xl px-2 py-2 min-w-0">
      <Icon size={11} className="text-warm-400 mb-0.5" />
      <p className="text-sm font-bold text-warm-900 leading-none tabular-nums">{value}</p>
      <p className="text-[9px] text-warm-400 mt-0.5 leading-none text-center">{label}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-beige-200 flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <div className="h-3.5 bg-beige-200 rounded w-28" />
            <div className="h-4 bg-beige-100 rounded-full w-12" />
          </div>
          <div className="h-2.5 bg-beige-100 rounded w-40" />
          <div className="h-2 bg-beige-100 rounded w-24" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-beige-100 grid grid-cols-3 gap-2">
        <div className="h-12 bg-beige-100 rounded-xl" />
        <div className="h-12 bg-beige-100 rounded-xl" />
        <div className="h-12 bg-beige-100 rounded-xl" />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="h-8 bg-beige-100 rounded-xl flex-1" />
        <div className="h-8 bg-beige-200 rounded-xl w-24" />
      </div>
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel, danger, onConfirm, onCancel, loading }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
      />
      <div className="relative bg-white rounded-3xl border border-beige-200 shadow-soft-lg p-6 w-full max-w-sm">
        <h3 className="text-base font-bold text-warm-900 mb-2">{title}</h3>
        <p className="text-sm text-warm-500 leading-relaxed mb-5">{body}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 text-sm font-medium text-warm-600 bg-cream-100 rounded-2xl border border-beige-200 hover:bg-beige-100 transition-colors disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 text-sm font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
              danger
                ? 'bg-danger text-white hover:bg-red-600'
                : 'bg-sage-500 text-white hover:bg-sage-600'
            }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Seller Card ──────────────────────────────────────────────────────────────
function SellerCard({ user, onVerify, onRevoke, verifyingId }) {
  const { t, lang } = useTranslation();
  const { seller } = user;
  const isVerified = seller?.is_verified;
  const isActing   = verifyingId === seller?.id;
  const score      = verificationScore(seller);

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3">
        <UserAvatar src={user.avatar_url || seller?.avatar_url} name={user.full_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-warm-900 truncate">
              {user.full_name || t('adminUsers.unknownUser')}
            </p>
            <RolePill role="seller" />
            {isVerified ? <VerifiedPill /> : <UnverifiedPill score={score} />}
          </div>
          <p className="text-xs text-warm-400 truncate">{user.email}</p>
          <p className="text-[10px] text-warm-300 mt-0.5">
            {t('adminUsers.joined')} {formatJoinDate(user.created_at, lang)}
          </p>
        </div>
      </div>

      {/* Shop details */}
      {seller && (
        <div className="mt-3 pt-3 border-t border-beige-100 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Store size={12} className="text-warm-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-warm-800 truncate">
              {seller.shop_name || '—'}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {seller.category?.name && (
              <span className="flex items-center gap-1 text-[10px] text-warm-500">
                <Tag size={9} className="text-warm-300" />
                {seller.category.name}
              </span>
            )}
            {(seller.location || seller.city) && (
              <span className="flex items-center gap-1 text-[10px] text-warm-500">
                <MapPin size={9} className="text-warm-300" />
                {t('wilayas.' + normalizeWilayaKey(seller.location || seller.city), seller.location || seller.city)}
              </span>
            )}
          </div>
        </div>
      )}

      {!seller && (
        <p className="mt-3 pt-3 border-t border-beige-100 text-xs text-warm-400 italic">
          {t('adminUsers.noShopProfile')}
        </p>
      )}

      {/* Stats */}
      {seller && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <StatMini
            icon={Package}
            value={seller.active_product_count ?? 0}
            label={t('adminUsers.products')}
          />
          <StatMini
            icon={ShoppingBag}
            value={seller.completed_order_count ?? 0}
            label={t('adminUsers.orders')}
          />
          <StatMini
            icon={Star}
            value={
              parseFloat(seller.avg_rating) > 0
                ? `${Number(seller.avg_rating).toFixed(1)}★`
                : '—'
            }
            label={t('adminUsers.rating')}
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        {seller && (
          <a
            href={`/sellers/${seller.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium text-warm-600 border border-beige-200 bg-cream-100 hover:bg-beige-100 px-3 py-2 rounded-xl transition-colors"
          >
            {t('adminUsers.viewShop')}
            <ExternalLink size={11} />
          </a>
        )}

        <div className="ml-auto flex gap-2">
          {seller && !isVerified && (
            <button
              onClick={() => onVerify(seller.id)}
              disabled={isActing}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-sage-500 hover:bg-sage-600 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {isActing
                ? <Loader2 size={12} className="animate-spin" />
                : <UserCheck size={12} />
              }
              {t('admin.verifyAction')}
            </button>
          )}
          {seller && isVerified && (
            <button
              onClick={() => onRevoke(seller.id, seller.shop_name)}
              disabled={isActing}
              className="flex items-center gap-1.5 text-xs font-medium text-danger border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
            >
              {isActing
                ? <Loader2 size={12} className="animate-spin" />
                : <XCircle size={12} />
              }
              {t('admin.revokeAction')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Client Card ──────────────────────────────────────────────────────────────
function ClientCard({ user, onChangeRole, roleChangingId }) {
  const { t, lang } = useTranslation();
  const stats    = user.client_stats || {};
  const isActing = roleChangingId === user.id;

  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3">
        <UserAvatar src={user.avatar_url} name={user.full_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-warm-900 truncate">
              {user.full_name || t('adminUsers.unknownUser')}
            </p>
            <RolePill role="client" />
          </div>
          <p className="text-xs text-warm-400 truncate">{user.email}</p>
          <p className="text-[10px] text-warm-300 mt-0.5">
            {t('adminUsers.joined')} {formatJoinDate(user.created_at, lang)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-beige-100 grid grid-cols-3 gap-2">
        <StatMini
          icon={ShoppingBag}
          value={stats.order_count ?? 0}
          label={t('adminUsers.placed')}
        />
        <StatMini
          icon={BadgeCheck}
          value={stats.completed_order_count ?? 0}
          label={t('adminUsers.completed')}
        />
        <StatMini
          icon={Star}
          value={stats.avg_rating ? `${stats.avg_rating}★` : '—'}
          label={t('adminUsers.rating')}
        />
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <a
          href={`/client/${user.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium text-warm-600 border border-beige-200 bg-cream-100 hover:bg-beige-100 px-3 py-2 rounded-xl transition-colors"
        >
          {t('adminUsers.viewProfile')}
          <ExternalLink size={11} />
        </a>

        <button
          onClick={() => onChangeRole(user.id, user.full_name)}
          disabled={isActing}
          className="flex items-center gap-1.5 text-xs font-medium text-sage-700 border border-sage-200 bg-sage-50 hover:bg-sage-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 ml-auto"
        >
          {isActing
            ? <Loader2 size={12} className="animate-spin" />
            : <Store size={12} />
          }
          {t('adminUsers.makeSeller')}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const { t } = useTranslation();

  const [users,          setUsers]          = useState([]);
  const [pagination,     setPagination]     = useState(null);
  const [tabCounts,      setTabCounts]      = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [actionError,    setActionError]    = useState(null);
  const [search,         setSearch]         = useState('');
  const [activeTab,      setActiveTab]      = useState('all');
  const [page,           setPage]           = useState(1);
  const [verifyingId,    setVerifyingId]    = useState(null);
  const [roleChangingId, setRoleChangingId] = useState(null);
  const [confirmModal,   setConfirmModal]   = useState(null);

  const debounceRef  = useRef(null);
  const currentTab   = TABS.find((tab) => tab.id === activeTab) || TABS[0];

  // Fetch tab counts once on mount
  useEffect(() => {
    Promise.all([
      adminAPI.getStats(),
      adminAPI.getUsers({ role: 'seller', verified: 'false', limit: 1, page: 1 }),
    ])
      .then(([statsRes, unvRes]) => {
        const s   = statsRes.data?.data?.stats;
        const unv = unvRes.data?.data?.pagination?.total || 0;
        setTabCounts({
          all:               s?.users?.total                   || 0,
          clients:           s?.users?.byRole?.client          || 0,
          sellers:           s?.users?.byRole?.seller          || 0,
          unverifiedSellers: unv,
        });
      })
      .catch(() => {});
  }, []);

  const fetchUsers = useCallback((params) => {
    setLoading(true);
    setError(null);
    adminAPI.getUsers(params)
      .then((res) => {
        const data = res.data?.data;
        setUsers(data?.users || []);
        setPagination(data?.pagination || null);
      })
      .catch((err) => {
        const { message } = resolveApiError(err);
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers({
        page,
        limit:    20,
        role:     currentTab.role || undefined,
        verified: currentTab.verified,
        search:   search || undefined,
      });
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [page, activeTab, search, fetchUsers, currentTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
    setActionError(null);
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // ── Verify (no modal needed) ────────────────────────────────
  const handleVerify = async (sellerId) => {
    setVerifyingId(sellerId);
    setActionError(null);
    try {
      await adminAPI.verifySeller(sellerId, true);
      setUsers((prev) =>
        prev.map((u) =>
          u.seller?.id === sellerId
            ? { ...u, seller: { ...u.seller, is_verified: true, admin_override: true } }
            : u
        )
      );
      setTabCounts((prev) =>
        prev ? { ...prev, unverifiedSellers: Math.max(0, (prev.unverifiedSellers || 0) - 1) } : prev
      );
    } catch (err) {
      const { message } = resolveApiError(err);
      setActionError(message);
    } finally {
      setVerifyingId(null);
    }
  };

  // ── Revoke (confirm modal) ──────────────────────────────────
  const handleRevoke = (sellerId, shopName) => {
    setConfirmModal({ type: 'revoke', sellerId, shopName });
  };

  const executeRevoke = async () => {
    const { sellerId } = confirmModal;
    setVerifyingId(sellerId);
    try {
      await adminAPI.verifySeller(sellerId, false);
      setUsers((prev) =>
        prev.map((u) =>
          u.seller?.id === sellerId
            ? { ...u, seller: { ...u.seller, is_verified: false, admin_override: false } }
            : u
        )
      );
      setTabCounts((prev) =>
        prev ? { ...prev, unverifiedSellers: (prev.unverifiedSellers || 0) + 1 } : prev
      );
      setConfirmModal(null);
    } catch (err) {
      const { message } = resolveApiError(err);
      setActionError(message);
    } finally {
      setVerifyingId(null);
    }
  };

  // ── Change role client→seller (confirm modal) ───────────────
  const handleChangeRole = (userId, userName) => {
    setConfirmModal({ type: 'changeRole', userId, userName });
  };

  const executeChangeRole = async () => {
    const { userId } = confirmModal;
    setRoleChangingId(userId);
    try {
      await adminAPI.updateUserRole(userId, 'seller');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: 'seller' } : u)));
      setTabCounts((prev) =>
        prev
          ? {
              ...prev,
              clients: Math.max(0, (prev.clients || 0) - 1),
              sellers: (prev.sellers || 0) + 1,
              unverifiedSellers: (prev.unverifiedSellers || 0) + 1,
            }
          : prev
      );
      setConfirmModal(null);
    } catch (err) {
      const { message } = resolveApiError(err);
      setActionError(message);
    } finally {
      setRoleChangingId(null);
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  const showingText = pagination
    ? `${(page - 1) * pagination.limit + 1}–${Math.min(page * pagination.limit, pagination.total)} of ${pagination.total}`
    : null;

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="admin" />
      <div className="flex-1 pb-28 md:pb-10">

      {/* ── Header (sticky) ─────────────────────────────────── */}
      <div className="bg-white border-b border-beige-200 px-4 pt-5 pb-0 sticky top-14 z-30">
        <Link
          to="/admin"
          className="text-xs text-sage-600 hover:text-sage-700 mb-3 inline-flex items-center gap-1 transition-colors"
        >
          <ChevronLeft size={12} />
          {t('admin.dashboard')}
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-warm-900">{t('adminUsers.title')}</h1>
            {pagination && (
              <p className="text-xs text-warm-400 mt-0.5">
                {t('adminUsers.totalCount', { count: pagination.total })}
              </p>
            )}
          </div>
          <div className="w-9 h-9 rounded-2xl bg-sage-50 border border-sage-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Users size={16} className="text-sage-600" />
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warm-300 pointer-events-none" />
          <input
            value={search}
            onChange={handleSearch}
            placeholder={t('adminUsers.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-beige-200 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-200 focus:border-sage-300 transition-all"
          />
        </div>

        {/* Tabs */}
        <div className="mt-3 -mx-4 px-4 overflow-x-auto pb-0">
          <div className="flex gap-1.5 min-w-max border-b border-beige-100 pb-0">
            {TABS.map((tab) => {
              const count    = tabCounts?.[tab.id];
              const isActive = activeTab === tab.id;
              const isWarn   = tab.id === 'unverifiedSellers';

              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? 'text-sage-700 border-sage-500'
                      : isWarn
                        ? 'text-amber-700 border-transparent hover:text-amber-800'
                        : 'text-warm-500 border-transparent hover:text-warm-700'
                  }`}
                >
                  {t(tab.labelKey)}
                  {count !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                        isActive
                          ? 'bg-sage-100 text-sage-700'
                          : isWarn
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-beige-200 text-warm-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-3">

        {/* Action error */}
        {actionError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-danger text-sm rounded-2xl px-4 py-3">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span className="flex-1">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-danger/60 hover:text-danger flex-shrink-0"
            >
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* Fetch error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-danger text-sm rounded-2xl px-4 py-3">
            <AlertTriangle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : users.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-beige-100 flex items-center justify-center mx-auto mb-4">
              <Users size={22} className="text-warm-300" />
            </div>
            <p className="text-sm font-semibold text-warm-600">{t('adminUsers.empty')}</p>
            <p className="text-xs text-warm-400 mt-1">{t('adminUsers.emptySub')}</p>
          </div>
        ) : (
          /* User list */
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {users.map((user) =>
              user.role === 'seller' || user.seller ? (
                <SellerCard
                  key={user.id}
                  user={user}
                  onVerify={handleVerify}
                  onRevoke={handleRevoke}
                  verifyingId={verifyingId}
                />
              ) : (
                <ClientCard
                  key={user.id}
                  user={user}
                  onChangeRole={handleChangeRole}
                  roleChangingId={roleChangingId}
                />
              )
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-warm-400">
              {showingText && t('adminUsers.showing', { range: showingText })}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-beige-200 text-warm-500 hover:bg-beige-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs font-medium text-warm-600 min-w-[3rem] text-center">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-beige-200 text-warm-500 hover:bg-beige-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm: Revoke ──────────────────────────────────── */}
      {confirmModal?.type === 'revoke' && (
        <ConfirmModal
          title={t('adminUsers.revokeTitle')}
          body={t('adminUsers.revokeBody', { name: confirmModal.shopName })}
          confirmLabel={t('admin.revokeAction')}
          danger
          loading={verifyingId === confirmModal.sellerId}
          onConfirm={executeRevoke}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* ── Confirm: Change role ──────────────────────────────── */}
      {confirmModal?.type === 'changeRole' && (
        <ConfirmModal
          title={t('adminUsers.changeRoleTitle')}
          body={t('adminUsers.changeRoleBody', { name: confirmModal.userName })}
          confirmLabel={t('adminUsers.makeSeller')}
          danger={false}
          loading={roleChangingId === confirmModal.userId}
          onConfirm={executeChangeRole}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      </div>
    </div>
  );
}
