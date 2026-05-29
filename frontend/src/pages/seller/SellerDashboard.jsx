import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Eye,
  Heart,
  Info,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Plus,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { extractApiItems, ordersAPI, sellersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n/index.jsx';
import DashboardSidebar from '../../components/layout/DashboardSidebar';

function formatCurrency(value) {
  if (!value && value !== 0) {
    return '—';
  }
  return `${Number(value).toLocaleString()} DA`;
}

function formatRelativeTime(dateString, t, lang = 'en') {
  if (!dateString) {
    return '';
  }
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t('common.justNow');
  if (minutes < 60) return t('common.minutesAgo', { count: minutes });
  if (hours < 24) return t('common.hoursAgo', { count: hours });
  if (days < 7) return t('common.daysAgo', { count: days });
  return new Date(dateString).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'en-GB', { day: 'numeric', month: 'short' });
}

const STATUS_STYLES = {
  pending:   { color: 'text-warning',  bg: 'bg-warning/10'  },
  accepted:  { color: 'text-sage-600', bg: 'bg-sage-50'     },
  rejected:  { color: 'text-danger',   bg: 'bg-red-50'      },
  completed: { color: 'text-warm-500', bg: 'bg-cream-200'   },
};

function StatCard({ icon, label, value, sub, accentColor = 'sage', loading = false }) {
  const Icon = icon;
  const colors = {
    sage:   { border: 'border-l-sage-500',   iconBg: 'bg-sage-50',   iconText: 'text-sage-600'   },
    brick:  { border: 'border-l-brick-500',  iconBg: 'bg-brick-100', iconText: 'text-brick-500'  },
    indigo: { border: 'border-l-indigo-400', iconBg: 'bg-indigo-50', iconText: 'text-indigo-500' },
    blue:   { border: 'border-l-blue-400',   iconBg: 'bg-blue-50',   iconText: 'text-blue-500'   },
    amber:  { border: 'border-l-amber-400',  iconBg: 'bg-amber-50',  iconText: 'text-amber-500'  },
  };
  const c = colors[accentColor] ?? colors.sage;
  return (
    <div className={`bg-white rounded-2xl border border-beige-200 border-l-4 ${c.border} p-4 flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
        <Icon size={18} className={c.iconText} />
      </div>
      {loading ? (
        <div className="space-y-1.5 flex-1">
          <div className="h-5 w-16 rounded-lg animate-pulse bg-beige-200" />
          <div className="h-3 w-12 rounded-lg animate-pulse bg-beige-200" />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-warm-900 leading-none">{value}</p>
          <p className="text-[10px] font-medium text-warm-400 mt-0.5">{label}</p>
          {sub && <p className="text-[9px] text-warm-300 mt-0.5">{sub}</p>}
        </div>
      )}
    </div>
  );
}

function QuickAction({ to, icon, label, desc, primary = false }) {
  const Icon = icon;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm ${
        primary ? 'bg-sage-500 hover:bg-sage-600 border-sage-500 text-white' : 'bg-white hover:border-sage-300 border-beige-200'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${primary ? 'bg-white/20' : 'bg-cream-200'}`}>
        <Icon size={17} className={primary ? 'text-white' : 'text-sage-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${primary ? 'text-white' : 'text-warm-800'}`}>{label}</p>
        <p className={`text-[10px] ${primary ? 'text-white/70' : 'text-warm-400'}`}>{desc}</p>
      </div>
      <ChevronRight size={14} className={primary ? 'text-white/70' : 'text-warm-400'} />
    </Link>
  );
}

function OrderRow({ order }) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const styles = STATUS_STYLES[order.status] ?? STATUS_STYLES.pending;
  const statusLabel = t(`orders.statuses.${order.status}`) || order.status;

  return (
    <div
      onClick={() => navigate('/seller/orders')}
      className="flex items-center gap-3 py-3 border-b border-beige-100 last:border-0 cursor-pointer hover:bg-cream-100 -mx-4 px-4 transition-colors"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.bg}`}>
        <Package size={15} className={styles.color} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warm-900 truncate">
          {order.client_name ?? t('sellerDashboard.customerFallback')}
        </p>
        <p className="text-[10px] text-warm-400 truncate">
          {order.notes
            ? `${order.notes.slice(0, 45)}${order.notes.length > 45 ? '…' : ''}`
            : t('sellerDashboard.customOrderFallback')
          }
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${styles.bg} ${styles.color}`}>
          {statusLabel}
        </span>
        <span className="text-[9px] text-warm-400">{formatRelativeTime(order.created_at, t, lang)}</span>
      </div>
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-beige-100">
        <h2 className="text-sm font-bold text-warm-900">{title}</h2>
        {action}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function VerificationCriterion({ criterion, t }) {
  const labels = {
    activeProducts:  t('verification.criteria.activeProducts',  { required: criterion.required }),
    completedOrders: t('verification.criteria.completedOrders', { required: criterion.required }),
    avgRating:       t('verification.criteria.avgRating',       { required: criterion.required }),
    completeProfile: t('verification.criteria.completeProfile'),
  };
  return (
    <div className="flex items-center gap-2.5">
      {criterion.met
        ? <CheckCircle2 size={15} className="text-sage-500 flex-shrink-0" />
        : <XCircle size={15} className="text-warm-300 flex-shrink-0" />
      }
      <span className={`text-xs ${criterion.met ? 'text-warm-700' : 'text-warm-400'}`}>
        {labels[criterion.key] ?? criterion.key}
        {criterion.key !== 'completeProfile' && (
          <span className="text-warm-400 ml-1">
            ({criterion.current}/{criterion.required})
          </span>
        )}
      </span>
    </div>
  );
}

export default function SellerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState('');
  const [noProfile, setNoProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    sellersAPI.getAnalytics()
      .then((response) => {
        setAnalytics(response.data?.data?.analytics ?? null);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setNoProfile(true);
        } else {
          setError(t('common.error'));
        }
      })
      .finally(() => setStatsLoading(false));
  }, [t]);

  useEffect(() => {
    ordersAPI.getAll({ limit: 5 })
      .then((response) => {
        setRecentOrders(extractApiItems(response, { itemKeys: ['orders'] }));
      })
      .catch(() => setRecentOrders([]))
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => {
    sellersAPI.getVerificationStatus()
      .then((response) => setVerificationStatus(response.data?.data ?? null))
      .catch(() => setVerificationStatus(null));
  }, []);

  const totalSales = analytics?.seller?.total_sales ?? 0;
  const totalRevenue = analytics?.total_revenue ?? 0;
  const totalViews = analytics?.total_views ?? 0;
  const avgRating = analytics?.seller?.avg_rating ?? 0;
  const pendingCount = analytics?.orders?.pending ?? recentOrders.filter((order) => order.status === 'pending').length;

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="seller" />

      <div className="flex-1 pb-28 md:pb-10">
      <div className="bg-white border-b border-beige-200 px-4 pt-5 pb-4">
        <p className="text-[10px] font-medium text-warm-400 uppercase tracking-widest mb-0.5">{t('sellerDashboard.welcome')}</p>
        <h1 className="text-xl font-bold text-warm-900">
          {user?.full_name ?? t('sellerDashboard.customerFallback')}
        </h1>
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/seller/orders')}
            className="mt-2.5 inline-flex items-center gap-2 bg-warning/10 border border-warning/25 text-warning text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-warning/15"
          >
            <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
            {t('sellerDashboard.pendingAlert', { count: pendingCount })}
            <ArrowUpRight size={12} />
          </button>
        )}
      </div>

      <div className="px-4 pt-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={ShoppingBag} label={t('sellerDashboard.stats.sales')} value={totalSales} accentColor="brick" loading={statsLoading} />
          <StatCard icon={TrendingUp} label={t('sellerDashboard.stats.revenue')} value={formatCurrency(totalRevenue)} accentColor="indigo" loading={statsLoading} />
          <StatCard icon={Eye} label={t('sellerDashboard.stats.views')} value={totalViews.toLocaleString()} accentColor="blue" loading={statsLoading} />
          <StatCard icon={Star} label={t('sellerDashboard.stats.rating')} value={avgRating ? `${Number(avgRating).toFixed(1)} ★` : '—'} accentColor="amber" loading={statsLoading} />
        </div>

        {noProfile && (
          <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Store size={16} className="text-sage-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-sage-800">{t('sellerDashboard.setupTitle')}</p>
              <p className="text-xs text-sage-600 mt-0.5 leading-relaxed">{t('sellerDashboard.setupSub')}</p>
              <Link
                to="/seller/profile"
                className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-white bg-sage-500 hover:bg-sage-600 px-3 py-1.5 rounded-xl transition-colors"
              >
                {t('sellerDashboard.setupAction')} <ArrowUpRight size={11} />
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-danger text-sm rounded-2xl px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Earn-badge info card: shop visible immediately, badge is earned */}
        {verificationStatus && !verificationStatus.isVerified && (
          <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info size={16} className="text-sage-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-warm-800">{t('seller.earnBadge')}</p>
              <p className="text-xs text-warm-500 mt-0.5 leading-relaxed">{t('seller.earnBadgeDesc')}</p>
            </div>
          </div>
        )}

        {/* Verification progress card */}
        {verificationStatus && !verificationStatus.isVerified && (
          <Section
            title={
              <span className="flex items-center gap-2">
                <BadgeCheck size={15} className="text-sage-500" />
                {t('verification.card.title')}
              </span>
            }
          >
            <div className="space-y-2.5 py-3">
              {(verificationStatus.criteria ?? []).map((criterion) => (
                <VerificationCriterion key={criterion.key} criterion={criterion} t={t} />
              ))}
            </div>
            <p className="text-[10px] text-warm-400 pb-2 leading-relaxed">
              {t('verification.card.hint')}
            </p>
          </Section>
        )}

        {/* Verified seller celebration banner */}
        {verificationStatus?.isVerified && (
          <div className="bg-sage-50 border border-sage-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <BadgeCheck size={18} className="text-sage-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-sage-800">{t('verification.card.verified')}</p>
          </div>
        )}

        <Section title={t('sellerDashboard.quickActions')}>
          <div className="space-y-2 py-2">
            <QuickAction to="/seller/products" icon={Plus} label={t('sellerDashboard.addProduct')} desc={t('sellerDashboard.addProductSub')} primary />
            <QuickAction to="/seller/orders" icon={ShoppingBag} label={t('sellerDashboard.viewOrders')} desc={t('sellerDashboard.viewOrdersSub')} />
            <QuickAction to="/seller/promotions" icon={TrendingUp} label={t('sellerDashboard.boostShop')} desc={t('sellerDashboard.boostShopSub')} />
            <QuickAction to="/wishlist" icon={Heart} label={t('nav.wishlist')} desc={t('profile.menu.savedItems')} />
            <QuickAction to="/seller/profile" icon={LayoutDashboard} label={t('seller.editShop')} desc={t('seller.editShopSubtitle')} />
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-beige-200 bg-white hover:border-danger hover:bg-red-50 transition-all duration-150 text-left hover:-translate-y-0.5 hover:shadow-sm w-full disabled:opacity-60"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100">
                {loggingOut ? <Loader2 size={17} className="text-danger animate-spin" /> : <LogOut size={17} className="text-danger" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warm-800">{t('auth.logout')}</p>
                <p className="text-[10px] text-warm-400">{t('auth.logoutSubtitle')}</p>
              </div>
              <ChevronRight size={14} className="text-warm-400" />
            </button>
          </div>
        </Section>

        <Section
          title={t('sellerDashboard.recentOrders')}
          action={(
            <Link to="/seller/orders" className="text-xs font-semibold text-sage-600 hover:text-sage-700 flex items-center gap-0.5">
              {t('sellerDashboard.seeAll')} <ChevronRight size={13} />
            </Link>
          )}
        >
          {ordersLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="text-sage-500 animate-spin" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package size={28} className="text-warm-300 mx-auto mb-2" />
              <p className="text-sm text-warm-400">{t('sellerDashboard.noOrders')}</p>
              <p className="text-xs text-warm-300 mt-0.5">{t('sellerDashboard.noOrdersSub')}</p>
            </div>
          ) : (
            recentOrders.map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </Section>

        {user?.seller_id && (
          <div className="bg-white border border-beige-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-warm-700 mb-0.5">{t('sellerDashboard.yourShop')}</p>
              <p className="text-[10px] text-warm-400 truncate">hirftna.dz/sellers/{user.seller_id}</p>
            </div>
            <Link
              to={`/sellers/${user.seller_id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-sage-600 border border-sage-200 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
            >
              {t('sellerDashboard.viewShop')} <ArrowUpRight size={12} />
            </Link>
          </div>
        )}
      </div>
      </div>

    </div>
  );
}
