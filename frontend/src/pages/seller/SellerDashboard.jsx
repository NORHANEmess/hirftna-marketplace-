import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  ChevronRight,
  Eye,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  Plus,
  ShoppingBag,
  Star,
  TrendingUp,
} from 'lucide-react';
import { extractApiItems, ordersAPI, sellersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function formatCurrency(value) {
  if (!value && value !== 0) {
    return '—';
  }
  return `${Number(value).toLocaleString()} DA`;
}

function formatRelativeTime(dateString) {
  if (!dateString) {
    return '';
  }
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-warning', bg: 'bg-warning/10' },
  accepted: { label: 'Accepted', color: 'text-sage-600', bg: 'bg-sage-50' },
  rejected: { label: 'Rejected', color: 'text-danger', bg: 'bg-red-50' },
  completed: { label: 'Completed', color: 'text-warm-500', bg: 'bg-cream-200' },
};

function StatCard({ icon, label, value, sub, accent = false, loading = false }) {
  const Icon = icon;
  return (
    <div className={`text-center relative overflow-hidden rounded-2xl border p-4 flex flex-col gap-2 ${
      accent ? 'bg-gradient-to-br from-sage-500 to-sage-700 border-sage-600 text-white' : 'bg-white border-beige-200'
    }`}>
      {accent && <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />}

      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-white/20' : 'bg-cream-200'}`}>
        <Icon size={18} className={accent ? 'text-white' : 'text-sage-600'} />
      </div>

      {loading ? (
        <div className="space-y-1.5">
          <div className={`h-6 w-20 rounded-lg animate-pulse ${accent ? 'bg-white/20' : 'bg-beige-200'}`} />
          <div className={`h-3 w-14 rounded-lg animate-pulse ${accent ? 'bg-white/10' : 'bg-beige-200'}`} />
        </div>
      ) : (
        <div>
          <p className={`text-xl font-bold leading-none ${accent ? 'text-white' : 'text-warm-900'}`}>{value}</p>
          <p className={`text-[10px] font-medium mt-1 ${accent ? 'text-white/70' : 'text-warm-400'}`}>{label}</p>
          {sub && <p className={`text-[9px] mt-0.5 ${accent ? 'text-white/50' : 'text-warm-300'}`}>{sub}</p>}
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
  const navigate = useNavigate();
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;

  return (
    <div
      onClick={() => navigate('/seller/orders')}
      className="flex items-center gap-3 py-3 border-b border-beige-100 last:border-0 cursor-pointer hover:bg-cream-100 -mx-4 px-4 transition-colors"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
        <Package size={15} className={config.color} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warm-900 truncate">{order.client_name ?? 'Customer'}</p>
        <p className="text-[10px] text-warm-400 truncate">
          {order.notes ? `${order.notes.slice(0, 45)}${order.notes.length > 45 ? '…' : ''}` : 'Custom order'}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>{config.label}</span>
        <span className="text-[9px] text-warm-400">{formatRelativeTime(order.created_at)}</span>
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

export default function SellerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    sellersAPI.getAnalytics()
      .then((response) => {
        setAnalytics(response.data?.data?.analytics ?? null);
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    ordersAPI.getAll({ limit: 5 })
      .then((response) => {
        setRecentOrders(extractApiItems(response, { itemKeys: ['orders'] }));
      })
      .catch(() => setRecentOrders([]))
      .finally(() => setOrdersLoading(false));
  }, []);

  const totalSales = analytics?.seller?.total_sales ?? 0;
  const totalRevenue = analytics?.total_revenue ?? 0;
  const totalViews = analytics?.products?.total ?? 0;
  const avgRating = analytics?.seller?.avg_rating ?? 0;
  const pendingCount = analytics?.orders?.pending ?? recentOrders.filter((order) => order.status === 'pending').length;

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">
      <div className="text-center bg-gradient-to-br from-sage-500 to-sage-700 px-4 pt-6 pb-10 mx-3 mt-3 rounded-3xl relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 left-8 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <p className="text-white/60 text-xs mb-1 tracking-wide">Welcome back,</p>
          <h1 className="text-white text-2xl font-bold leading-tight mb-1" style={{ fontFamily: "'Amiri', serif" }}>
            {user?.full_name ?? 'Artisan'}
          </h1>
        </div>

        {pendingCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/seller/orders')}
            className="mt-3 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
          >
            <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
            {pendingCount} order{pendingCount !== 1 ? 's' : ''} awaiting your review
            <ArrowUpRight size={12} />
          </button>
        )}
      </div>

      <div className="px-4 -mt-5 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={ShoppingBag} label="Completed Sales" value={totalSales} accent loading={statsLoading} />
          <StatCard icon={TrendingUp} label="Total Revenue" value={formatCurrency(totalRevenue)} loading={statsLoading} />
          <StatCard icon={Eye} label="Product Count" value={totalViews.toLocaleString()} loading={statsLoading} />
          <StatCard icon={Star} label="Average Rating" value={avgRating ? `${Number(avgRating).toFixed(1)} ★` : '—'} loading={statsLoading} />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-danger text-sm rounded-2xl px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <Section title="Quick Actions">
          <div className="space-y-2 py-2">
            <QuickAction to="/seller/products" icon={Plus} label="Add New Product" desc="List a new handmade item" primary />
            <QuickAction to="/seller/orders" icon={ShoppingBag} label="View All Orders" desc="Manage incoming custom orders" />
            <QuickAction to="/wishlist" icon={Heart} label="My Wishlist" desc="Items you've saved" />
            <QuickAction to="/seller/profile" icon={LayoutDashboard} label="Edit Shop Profile" desc="Update story, avatar and info" />
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
                <p className="text-sm font-semibold text-warm-800">Sign Out</p>
                <p className="text-[10px] text-warm-400">End your session</p>
              </div>
              <ChevronRight size={14} className="text-warm-400" />
            </button>
          </div>
        </Section>

        <Section
          title="Recent Orders"
          action={(
            <Link to="/seller/orders" className="text-xs font-semibold text-sage-600 hover:text-sage-700 flex items-center gap-0.5">
              See all <ChevronRight size={13} />
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
              <p className="text-sm text-warm-400">No orders yet</p>
              <p className="text-xs text-warm-300 mt-0.5">Share your shop link to start receiving orders</p>
            </div>
          ) : (
            recentOrders.map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </Section>

        {user?.seller_id && (
          <div className="bg-white border border-beige-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-warm-700 mb-0.5">Your public shop</p>
              <p className="text-[10px] text-warm-400 truncate">hirftna.dz/sellers/{user.seller_id}</p>
            </div>
            <Link
              to={`/sellers/${user.seller_id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-sage-600 border border-sage-200 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
            >
              View <ArrowUpRight size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
