import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Package,
  ShoppingBag,
  TrendingUp,
  UserCheck,
  Store,
  Star,
  CalendarDays,
  Loader2,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import DashboardSidebar from '../../components/layout/DashboardSidebar';

function formatCurrency(value) {
  if (!value && value !== 0) return '—';
  return `${Number(value).toLocaleString()} DA`;
}

function StatCard({ icon, label, value, sub, accent = false, loading = false }) {
  const Icon = icon;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 flex flex-col gap-2 ${
        accent
          ? 'bg-gradient-to-br from-sage-500 to-sage-700 border-sage-600 text-white'
          : 'bg-white border-beige-200'
      }`}
    >
      {accent && <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          accent ? 'bg-white/20' : 'bg-cream-200'
        }`}
      >
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

function StatusBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-xs text-warm-500 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-beige-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-warm-700">{count}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminAPI.getStats()
      .then((res) => setStats(res.data?.data?.stats))
      .catch(() => setError('Failed to load stats. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const totalOrders = stats?.orders?.total || 0;

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="admin" />

      <div className="flex-1 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-beige-200 px-4 pt-6 pb-4">
        <p className="text-xs font-medium text-sage-600 uppercase tracking-widest mb-1">Admin Panel</p>
        <h1 className="text-2xl font-bold text-warm-900">Dashboard</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Top stats row */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="Total Users" value={stats?.users?.total ?? '—'} loading={loading} />
          <StatCard icon={Package} label="Total Products" value={stats?.products?.total ?? '—'} sub={`${stats?.products?.active ?? 0} active`} loading={loading} />
          <StatCard icon={ShoppingBag} label="Total Orders" value={stats?.orders?.total ?? '—'} loading={loading} />
          <StatCard icon={TrendingUp} label="Total Revenue" value={stats ? formatCurrency(stats.revenue?.total) : '—'} accent loading={loading} />
        </div>

        {/* Orders by status */}
        <div className="bg-white rounded-2xl border border-beige-200 p-4">
          <h2 className="text-sm font-semibold text-warm-900 mb-3">Orders by Status</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-beige-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2">
              <StatusBar label="Pending" count={stats?.orders?.byStatus?.pending ?? 0} total={totalOrders} color="bg-amber-400" />
              <StatusBar label="Accepted" count={stats?.orders?.byStatus?.accepted ?? 0} total={totalOrders} color="bg-blue-400" />
              <StatusBar label="Ready" count={stats?.orders?.byStatus?.ready ?? 0} total={totalOrders} color="bg-indigo-400" />
              <StatusBar label="Completed" count={stats?.orders?.byStatus?.completed ?? 0} total={totalOrders} color="bg-sage-500" />
              <StatusBar label="Rejected" count={stats?.orders?.byStatus?.rejected ?? 0} total={totalOrders} color="bg-red-400" />
            </div>
          )}
        </div>

        {/* Users by role + this month */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-beige-200 p-4">
            <h2 className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-3">Users by Role</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-4 bg-beige-100 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-warm-500">Clients</span><span className="font-semibold text-warm-900">{stats?.users?.byRole?.client ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-warm-500">Sellers</span><span className="font-semibold text-warm-900">{stats?.users?.byRole?.seller ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-warm-500">Admins</span><span className="font-semibold text-warm-900">{stats?.users?.byRole?.admin ?? 0}</span></div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-beige-200 p-4">
            <h2 className="text-xs font-semibold text-warm-500 uppercase tracking-wide mb-3">This Month</h2>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-4 bg-beige-100 rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-warm-500">New Users</span><span className="font-semibold text-sage-600">{stats?.thisMonth?.newUsers ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-warm-500">New Orders</span><span className="font-semibold text-sage-600">{stats?.thisMonth?.newOrders ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-warm-500">Reviews</span><span className="font-semibold text-warm-900">{stats?.reviews?.total ?? 0}</span></div>
              </div>
            )}
          </div>
        </div>

        {/* Top sellers */}
        <div className="bg-white rounded-2xl border border-beige-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Store size={16} className="text-sage-600" />
            <h2 className="text-sm font-semibold text-warm-900">Top Sellers</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-beige-100 rounded-lg animate-pulse" />)}
            </div>
          ) : !stats?.topSellers?.length ? (
            <p className="text-sm text-warm-400 text-center py-2">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topSellers.map((s, i) => (
                <div key={s.seller_id} className="flex items-center justify-between py-1.5 border-b border-beige-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs text-warm-400 font-medium">#{i + 1}</span>
                    <span className="text-sm font-medium text-warm-800">{s.shop_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-warm-400">
                    <span><Star size={11} className="inline text-amber-400 mr-0.5" />{Number(s.avg_rating || 0).toFixed(1)}</span>
                    <span className="font-semibold text-sage-600">{s.completed_orders} orders</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-2xl border border-beige-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-amber-500" />
            <h2 className="text-sm font-semibold text-warm-900">Top Products by Rating</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-beige-100 rounded-lg animate-pulse" />)}
            </div>
          ) : !stats?.topProducts?.length ? (
            <p className="text-sm text-warm-400 text-center py-2">No data yet</p>
          ) : (
            <div className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-beige-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-xs text-warm-400 font-medium">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-warm-800 leading-tight">{p.name}</p>
                      <p className="text-[10px] text-warm-400">{p.seller_name}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-600">
                    <Star size={11} className="inline text-amber-400 mr-0.5" />
                    {Number(p.avg_rating || 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
