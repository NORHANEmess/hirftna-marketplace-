import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Package } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import OrderCard from '../../components/order/OrderCard';

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: 'all',       label: 'All'       },
  { value: 'pending',   label: 'Pending'   },
  { value: 'accepted',  label: 'Accepted'  },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected',  label: 'Rejected'  },
];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function OrderSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-beige-200 p-4 flex items-center gap-3 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-beige-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-3 bg-beige-200 rounded-full w-28" />
          <div className="h-4 bg-beige-200 rounded-full w-16" />
        </div>
        <div className="h-3 bg-beige-200 rounded-full w-full" />
        <div className="h-2 bg-beige-200 rounded-full w-16" />
      </div>
      <div className="w-5 h-5 bg-beige-200 rounded-full flex-shrink-0" />
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilter }) {
  const navigate = useNavigate();
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 bg-cream-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <Package size={26} className="text-warm-300" />
      </div>
      <p className="text-warm-800 font-semibold mb-1">
        {hasFilter ? 'No orders with this status' : 'No orders yet'}
      </p>
      <p className="text-warm-400 text-sm mb-6">
        {hasFilter
          ? 'Try a different filter tab above'
          : 'Browse handmade products and place your first custom order'
        }
      </p>
      {!hasFilter && (
        <button
          onClick={() => navigate('/browse')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white
            text-sm font-semibold rounded-2xl hover:bg-sage-600 transition-colors"
        >
          <ShoppingBag size={15} /> Start Browsing
        </button>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const [searchParams]              = useSearchParams();
  const [orders,      setOrders]    = useState([]);
  const [loading,     setLoading]   = useState(true);
  const [activeTab,   setActiveTab] = useState('all');

  // Support deep-link from notifications: /orders?id=<orderId>
  // The page auto-expands that order (handled by the OrderCard default open prop below)
  const highlightId = searchParams.get('id') ?? null;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      // GET /api/v1/orders — for a client role, returns their outgoing orders
      const res  = await ordersAPI.getAll();
      const data = res.data?.data;
      setOrders(Array.isArray(data) ? data : (data?.orders ?? []));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // ── Filter orders by active tab ──
  const filtered = activeTab === 'all'
    ? orders
    : orders.filter(o => o.status === activeTab);

  // ── When an order is updated (accepted/rejected), merge the new data in ──
  function handleOrderUpdated(updated) {
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Page Header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-warm-900">My Orders</h1>
              <p className="text-xs text-warm-400">
                {loading ? '…' : `${orders.length} total`}
                {pendingCount > 0 && ` · ${pendingCount} pending`}
              </p>
            </div>
          </div>

          {/* Status filter tabs — horizontally scrollable */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {STATUS_TABS.map(tab => {
              const count = tab.value === 'all'
                ? orders.length
                : orders.filter(o => o.status === tab.value).length;

              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                    whitespace-nowrap border transition-all duration-150 flex-shrink-0
                    ${activeTab === tab.value
                      ? 'bg-sage-500 text-white border-sage-500 shadow-sm'
                      : 'bg-white text-warm-500 border-beige-200 hover:border-sage-300'
                    }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                      ${activeTab === tab.value
                        ? 'bg-white/20 text-white'
                        : 'bg-cream-200 text-warm-400'
                      }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Orders List ── */}
      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <OrderSkeleton key={i} />)
          : filtered.length === 0
            ? <EmptyState hasFilter={activeTab !== 'all'} />
            : filtered.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  viewAs="client"
                  onUpdated={handleOrderUpdated}
                />
              ))
        }
      </div>
    </div>
  );
}