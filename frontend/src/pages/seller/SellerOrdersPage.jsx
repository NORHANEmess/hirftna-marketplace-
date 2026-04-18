import { useState, useEffect, useCallback } from 'react';
import { ShoppingBag, Inbox, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import OrderCard from '../../components/order/OrderCard';

// ─── Status filter pills ───────────────────────────────────────────────────────
const STATUS_FILTERS = [
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
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ tab, hasFilter }) {
  const navigate = useNavigate();
  const isIncoming = tab === 'incoming';

  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 bg-cream-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
        {isIncoming
          ? <Inbox size={26} className="text-warm-300" />
          : <ShoppingBag size={26} className="text-warm-300" />
        }
      </div>
      <p className="text-warm-800 font-semibold mb-1">
        {hasFilter
          ? 'No orders with this status'
          : isIncoming ? 'No incoming orders yet' : 'You haven\'t placed any orders'
        }
      </p>
      <p className="text-warm-400 text-sm mb-6">
        {hasFilter
          ? 'Try a different filter'
          : isIncoming
            ? 'Share your shop to start receiving custom order requests'
            : 'You can also buy from other artisans'
        }
      </p>
      {!hasFilter && !isIncoming && (
        <button
          onClick={() => navigate('/browse')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white
            text-sm font-semibold rounded-2xl hover:bg-sage-600 transition-colors"
        >
          <ShoppingBag size={15} /> Browse Products
        </button>
      )}
    </div>
  );
}

// ─── Orders List with status filter ──────────────────────────────────────────
function OrdersList({ orders, loading, viewAs, statusFilter, onStatusFilter, onOrderUpdated }) {
  const filtered = statusFilter === 'all'
    ? orders
    : orders.filter(o => o.status === statusFilter);

  return (
    <div>
      {/* Status filter pills */}
      {!loading && orders.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2">
          {STATUS_FILTERS.map(f => {
            const count = f.value === 'all'
              ? orders.length
              : orders.filter(o => o.status === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => onStatusFilter(f.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                  whitespace-nowrap border transition-all flex-shrink-0
                  ${statusFilter === f.value
                    ? 'bg-sage-500 text-white border-sage-500'
                    : 'bg-white text-warm-500 border-beige-200 hover:border-sage-300'
                  }`}
              >
                {f.label}
                {count > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                    ${statusFilter === f.value ? 'bg-white/20 text-white' : 'bg-cream-200 text-warm-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Order cards */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <OrderSkeleton key={i} />)
          : filtered.length === 0
            ? <EmptyState tab={viewAs === 'seller' ? 'incoming' : 'purchases'} hasFilter={statusFilter !== 'all'} />
            : filtered.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  viewAs={viewAs}
                  onUpdated={onOrderUpdated}
                />
              ))
        }
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SellerOrdersPage() {
  // "incoming" = orders placed by clients to this seller
  // "purchases" = orders this seller placed as a buyer from other sellers
  const [activeTab,        setActiveTab]        = useState('incoming');
  const [incomingOrders,   setIncomingOrders]   = useState([]);
  const [purchaseOrders,   setPurchaseOrders]   = useState([]);
  const [loadingIncoming,  setLoadingIncoming]  = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [incomingFilter,   setIncomingFilter]   = useState('all');
  const [purchaseFilter,   setPurchaseFilter]   = useState('all');

  // ── Load incoming orders (seller receiving) ──
  const loadIncoming = useCallback(async () => {
    setLoadingIncoming(true);
    try {
      // Default for seller role: GET /api/v1/orders → incoming orders
      const res  = await ordersAPI.getAll();
      const data = res.data?.data;
      setIncomingOrders(Array.isArray(data) ? data : (data?.orders ?? []));
    } catch {
      setIncomingOrders([]);
    } finally {
      setLoadingIncoming(false);
    }
  }, []);

  // ── Load purchase orders (seller acting as buyer) ──
  const loadPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      // GET /api/v1/orders?as=client → seller's outgoing orders
      const res  = await ordersAPI.getAll({ as: 'client' });
      const data = res.data?.data;
      setPurchaseOrders(Array.isArray(data) ? data : (data?.orders ?? []));
    } catch {
      setPurchaseOrders([]);
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  // Load incoming on mount; load purchases only when tab is first activated
  useEffect(() => { loadIncoming(); }, [loadIncoming]);

  useEffect(() => {
    if (activeTab === 'purchases' && purchaseOrders.length === 0 && !loadingPurchases) {
      loadPurchases();
    }
  }, [activeTab]); // eslint-disable-line

  // ── Merge updated order back into the correct list ──
  function handleIncomingUpdated(updated) {
    setIncomingOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  }
  function handlePurchaseUpdated(updated) {
    setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
  }

  const pendingCount = incomingOrders.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Sticky header ── */}
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-warm-900">Orders</h1>
              {pendingCount > 0 && (
                <p className="text-xs text-warning font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
                  {pendingCount} order{pendingCount > 1 ? 's' : ''} need{pendingCount === 1 ? 's' : ''} your review
                </p>
              )}
            </div>
          </div>

          {/* Main tab switcher */}
          <div className="flex gap-1.5 bg-cream-200 p-1 rounded-2xl border border-beige-200">
            {[
              { value: 'incoming',  label: 'Incoming',    icon: Inbox,       count: incomingOrders.length  },
              { value: 'purchases', label: 'My Purchases', icon: ShoppingBag, count: purchaseOrders.length  },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                  text-sm font-semibold transition-all duration-150
                  ${activeTab === tab.value
                    ? 'bg-sage-500 text-white shadow-sm'
                    : 'text-warm-500 hover:text-warm-800 hover:bg-cream-100'
                  }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                    ${activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-beige-200 text-warm-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Order lists ── */}
      <div className="max-w-xl mx-auto px-4 py-4">
        {activeTab === 'incoming' ? (
          <OrdersList
            orders={incomingOrders}
            loading={loadingIncoming}
            viewAs="seller"
            statusFilter={incomingFilter}
            onStatusFilter={setIncomingFilter}
            onOrderUpdated={handleIncomingUpdated}
          />
        ) : (
          <OrdersList
            orders={purchaseOrders}
            loading={loadingPurchases}
            viewAs="client"
            statusFilter={purchaseFilter}
            onStatusFilter={setPurchaseFilter}
            onOrderUpdated={handlePurchaseUpdated}
          />
        )}
      </div>
    </div>
  );
}