<<<<<<< HEAD
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
=======
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, TrendingUp, Eye, Star, Plus,
  ChevronRight, Package, CheckCircle2, XCircle,
  Clock, ArrowUpRight, LayoutDashboard, Loader2,
  AlertCircle, LogOut, Heart,
} from 'lucide-react';
import { sellersAPI, ordersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(val) {
  if (!val && val !== 0) return '—';
  return `${Number(val).toLocaleString()} DA`;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── Order status config ──────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { label: 'Pending',   icon: Clock,        color: 'text-warning',   bg: 'bg-warning/10'  },
  accepted:  { label: 'Accepted',  icon: CheckCircle2, color: 'text-sage-600',  bg: 'bg-sage-50'     },
  rejected:  { label: 'Rejected',  icon: XCircle,      color: 'text-danger',    bg: 'bg-red-50'      },
  completed: { label: 'Completed', icon: Package,      color: 'text-warm-500',  bg: 'bg-cream-200'   },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = false, loading }) {
  return (
    <div className={`text-center relative overflow-hidden rounded-2xl border p-4 flex flex-col gap-2
      ${accent
        ? 'bg-gradient-to-br from-sage-500 to-sage-700 border-sage-600 text-white'
        : 'bg-white border-beige-200'
      }`}
    >
      {/* Background decoration */}
      {accent && (
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />
      )}

      <div className={`w-9 h-9 rounded-xl flex items-center justify-center
        ${accent ? 'bg-white/20' : 'bg-cream-200'}`}>
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
        <Icon size={18} className={accent ? 'text-white' : 'text-sage-600'} />
      </div>

      {loading ? (
        <div className="space-y-1.5">
          <div className={`h-6 w-20 rounded-lg animate-pulse ${accent ? 'bg-white/20' : 'bg-beige-200'}`} />
          <div className={`h-3 w-14 rounded-lg animate-pulse ${accent ? 'bg-white/10' : 'bg-beige-200'}`} />
        </div>
      ) : (
        <div>
<<<<<<< HEAD
          <p className={`text-xl font-bold leading-none ${accent ? 'text-white' : 'text-warm-900'}`}>{value}</p>
          <p className={`text-[10px] font-medium mt-1 ${accent ? 'text-white/70' : 'text-warm-400'}`}>{label}</p>
          {sub && <p className={`text-[9px] mt-0.5 ${accent ? 'text-white/50' : 'text-warm-300'}`}>{sub}</p>}
=======
          <p className={`text-xl font-bold leading-none ${accent ? 'text-white' : 'text-warm-900'}`}>
            {value}
          </p>
          <p className={`text-[10px] font-medium mt-1 ${accent ? 'text-white/70' : 'text-warm-400'}`}>
            {label}
          </p>
          {sub && (
            <p className={`text-[9px] mt-0.5 ${accent ? 'text-white/50' : 'text-warm-300'}`}>
              {sub}
            </p>
          )}
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
        </div>
      )}
    </div>
  );
}

<<<<<<< HEAD
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
=======
// ─── Quick Action Button ──────────────────────────────────────────────────────
function QuickAction({ to, icon: Icon, label, desc, primary = false }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm
        ${primary
          ? 'bg-sage-500 hover:bg-sage-600 border-sage-500 text-white'
          : 'bg-white hover:border-sage-300 border-beige-200'
        }`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
        ${primary ? 'bg-white/20' : 'bg-cream-200'}`}>
        <Icon size={17} className={primary ? 'text-white' : 'text-sage-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${primary ? 'text-white' : 'text-warm-800'}`}>
          {label}
        </p>
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
        <p className={`text-[10px] ${primary ? 'text-white/70' : 'text-warm-400'}`}>{desc}</p>
      </div>
      <ChevronRight size={14} className={primary ? 'text-white/70' : 'text-warm-400'} />
    </Link>
  );
}

<<<<<<< HEAD
function OrderRow({ order }) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
=======
// ─── Recent Order Row ─────────────────────────────────────────────────────────
function OrderRow({ order }) {
  const navigate = useNavigate();
  const cfg      = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const Icon     = cfg.icon;
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3

  return (
    <div
      onClick={() => navigate('/seller/orders')}
<<<<<<< HEAD
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
=======
      className="flex items-center gap-3 py-3 border-b border-beige-100 last:border-0
        cursor-pointer hover:bg-cream-100 -mx-4 px-4 transition-colors"
    >
      {/* Status icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
        <Icon size={15} className={cfg.color} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warm-900 truncate">
          {order.client_name ?? 'Customer'}
        </p>
        <p className="text-[10px] text-warm-400 truncate">
          {order.notes
            ? order.notes.slice(0, 45) + (order.notes.length > 45 ? '…' : '')
            : 'Custom order'
          }
        </p>
      </div>

      {/* Right: status + time */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
        <span className="text-[9px] text-warm-400">{formatRelativeTime(order.created_at)}</span>
      </div>
    </div>
  );
}

<<<<<<< HEAD
=======
// ─── Section Shell ────────────────────────────────────────────────────────────
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
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

<<<<<<< HEAD
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
=======
// ─── Skeleton for order rows ──────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-beige-100 last:border-0">
      <div className="w-9 h-9 rounded-xl bg-beige-200 animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-beige-200 rounded-full w-28 animate-pulse" />
        <div className="h-2 bg-beige-200 rounded-full w-40 animate-pulse" />
      </div>
      <div className="space-y-1 items-end flex flex-col">
        <div className="h-4 bg-beige-200 rounded-full w-14 animate-pulse" />
        <div className="h-2 bg-beige-200 rounded-full w-10 animate-pulse" />
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function SellerDashboard() {
  const navigate        = useNavigate();
  const { user, logout } = useAuth();

  const [analytics,     setAnalytics]     = useState(null);
  const [recentOrders,  setRecentOrders]  = useState([]);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error,         setError]         = useState('');

  // ── Handle logout ──
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // ── Load analytics ──
  useEffect(() => {
    sellersAPI.getAnalytics()
      .then((res) => {
        const data = res.data?.data;
        setAnalytics(data ?? null);
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setStatsLoading(false));
  }, []);

<<<<<<< HEAD
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
=======
  // ── Load recent incoming orders (last 5) ──
  useEffect(() => {
    ordersAPI.getAll({ limit: 5 })
      .then((res) => {
        const data = res.data?.data;
        setRecentOrders(Array.isArray(data) ? data : (data?.orders ?? []));
      })
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, []);

  // ── Derived values from analytics ──
  const totalSales    = analytics?.total_sales    ?? analytics?.completed_orders ?? 0;
  const totalRevenue  = analytics?.total_revenue  ?? 0;
  const totalViews    = analytics?.total_views    ?? analytics?.product_views    ?? 0;
  const avgRating     = analytics?.avg_rating     ?? 0;
  const pendingCount  = recentOrders.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Welcome Header ── */}
      <div>
      <div className="text-center bg-gradient-to-br from-sage-500 to-sage-700 px-4 pt-6 pb-10 mx-3 mt-3 rounded-3xl relative overflow-hidden">
        {/* Decoration */}
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 left-8 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <p className="text-white/60 text-xs mb-1 tracking-wide">Welcome back,</p>
<<<<<<< HEAD
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

=======
          <h1
            className="text-white text-2xl font-bold leading-tight mb-1"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {user?.full_name ?? 'Artisan'}
          </h1>
        </div>
          {pendingCount > 0 && (
            <button
              onClick={() => navigate('/seller/orders')}
              className="mt-3 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30
                backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            >
              <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
              {pendingCount} order{pendingCount !== 1 ? 's' : ''} awaiting your review
              <ArrowUpRight size={12} />
            </button>
          )}
        
        </div>
      </div>

      <div className="px-4 -mt-5 space-y-5">

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={ShoppingBag}
            label="Completed Sales"
            value={totalSales}
            accent
            loading={statsLoading}
          />
          <StatCard
            icon={TrendingUp}
            label="Total Revenue"
            value={formatCurrency(totalRevenue)}
            loading={statsLoading}
          />
          <StatCard
            icon={Eye}
            label="Product Views"
            value={totalViews.toLocaleString()}
            loading={statsLoading}
          />
          <StatCard
            icon={Star}
            label="Average Rating"
            value={avgRating ? `${Number(avgRating).toFixed(1)} ★` : '—'}
            loading={statsLoading}
          />
        </div>

        {/* API error */}
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-danger text-sm rounded-2xl px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

<<<<<<< HEAD
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
=======
        {/* ── Quick Actions ── */}
        <Section title="Quick Actions">
          <div className="space-y-2 py-2">
            <QuickAction
              to="/seller/products"
              icon={Plus}
              label="Add New Product"
              desc="List a new handmade item"
              primary
            />
            <QuickAction
              to="/seller/orders"
              icon={ShoppingBag}
              label="View All Orders"
              desc="Manage incoming custom orders"
            />
            <QuickAction
              to="/wishlist"
              icon={Heart}
              label="My Wishlist"
              desc="Items you've saved"
            />
            <QuickAction
              to="/seller/profile"
              icon={LayoutDashboard}
              label="Edit Shop Profile"
              desc="Update story, avatar and info"
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 p-3.5 rounded-2xl border border-beige-200 
                bg-white hover:border-danger hover:bg-red-50 transition-all duration-150 
                text-left hover:-translate-y-0.5 hover:shadow-sm w-full"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-100">
                <LogOut size={17} className="text-danger" />
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-warm-800">Sign Out</p>
                <p className="text-[10px] text-warm-400">End your session</p>
              </div>
              <ChevronRight size={14} className="text-warm-400" />
            </button>
          </div>
        </Section>

<<<<<<< HEAD
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
=======
        {/* ── Recent Orders ── */}
        <Section
          title="Recent Orders"
          action={
            <Link
              to="/seller/orders"
              className="text-xs font-semibold text-sage-600 hover:text-sage-700 flex items-center gap-0.5"
            >
              See all <ChevronRight size={13} />
            </Link>
          }
        >
          {ordersLoading ? (
            Array.from({ length: 3 }).map((_, i) => <OrderSkeleton key={i} />)
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package size={28} className="text-warm-300 mx-auto mb-2" />
              <p className="text-sm text-warm-400">No orders yet</p>
<<<<<<< HEAD
              <p className="text-xs text-warm-300 mt-0.5">Share your shop link to start receiving orders</p>
            </div>
          ) : (
            recentOrders.map((order) => <OrderRow key={order.id} order={order} />)
          )}
        </Section>

=======
              <p className="text-xs text-warm-300 mt-0.5">
                Share your shop link to start receiving orders
              </p>
            </div>
          ) : (
            recentOrders.map(o => <OrderRow key={o.id} order={o} />)
          )}
        </Section>

        {/* ── Shop Link ── */}
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
        {user?.seller_id && (
          <div className="bg-white border border-beige-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-warm-700 mb-0.5">Your public shop</p>
<<<<<<< HEAD
              <p className="text-[10px] text-warm-400 truncate">hirftna.dz/sellers/{user.seller_id}</p>
            </div>
            <Link
              to={`/sellers/${user.seller_id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-sage-600 border border-sage-200 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
=======
              <p className="text-[10px] text-warm-400 truncate">
                hirftna.dz/sellers/{user.seller_id}
              </p>
            </div>
            <Link
              to={`/sellers/${user.seller_id}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-sage-600
                border border-sage-200 bg-sage-50 hover:bg-sage-100 px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
            >
              View <ArrowUpRight size={12} />
            </Link>
          </div>
        )}
<<<<<<< HEAD
      </div>
    </div>
  );
}
=======

      </div>
    </div>
  );
}
>>>>>>> 9d334872a844882ceb26fe1dcc572925557c62d3
