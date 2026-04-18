import { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';
import { ordersAPI } from '../../services/api';
import OrderCard from '../../components/order/OrderCard';
import { Spinner } from '../../components/ui/Spinner';
import clsx from 'clsx';

const STATUS_FILTERS = [
  { value: '',           label: 'All'       },
  { value: 'pending',    label: 'Pending'   },
  { value: 'accepted',   label: 'Accepted'  },
  { value: 'completed',  label: 'Completed' },
  { value: 'rejected',   label: 'Rejected'  },
];

// ─────────────────────────────────────────────────────────────
// ORDERS TAB — reusable for both incoming and outgoing
// ─────────────────────────────────────────────────────────────
function OrdersTab({ mode }) {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);

  const fetchOrders = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = { page: reset ? 1 : page, limit: 10 };
      if (statusFilter)       params.status = statusFilter;
      if (mode === 'outgoing') params.as    = 'client';

      const res = await ordersAPI.getAll(params);
      const items = res.data.data.items || [];
      setOrders(reset ? items : (prev) => [...prev, ...items]);
      setTotal(res.data.data.pagination?.total || 0);
      if (reset) setPage(1);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [mode, statusFilter, page]);

  useEffect(() => { fetchOrders(true); }, [mode, statusFilter]);

  const handleStatusChange = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o)
    );
  };

  return (
    <div>
      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={clsx(
              'flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
              statusFilter === f.value
                ? 'bg-sage-500 text-white border-sage-500'
                : 'bg-white text-warm-600 border-beige-200 hover:border-sage-300'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      <div className="space-y-3 pb-4">
        {loading && orders.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-3xl" />
          ))
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <span className="text-5xl mb-3">
              {mode === 'incoming' ? '📭' : '🛍️'}
            </span>
            <p className="text-sm font-semibold text-warm-700 mb-1">
              {mode === 'incoming' ? 'No incoming orders' : 'No purchases yet'}
            </p>
            <p className="text-xs text-warm-400">
              {mode === 'incoming'
                ? statusFilter ? 'No orders with this status' : 'New orders will appear here'
                : 'Orders you place from other sellers appear here'}
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              mode={mode === 'incoming' ? 'seller' : 'client'}
              onStatusChange={mode === 'incoming' ? handleStatusChange : undefined}
            />
          ))
        )}

        {!loading && orders.length < total && (
          <div className="text-center pt-2">
            <button
              onClick={() => { setPage(p => p + 1); fetchOrders(); }}
              className="btn-outline px-6 py-2 text-sm"
            >
              Load More
            </button>
          </div>
        )}
        {loading && orders.length > 0 && (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SELLER ORDERS PAGE — Incoming + Outgoing tabs
// ─────────────────────────────────────────────────────────────
export default function SellerOrdersPage() {
  const [activeTab, setActiveTab] = useState('incoming');

  const tabs = [
    { key: 'incoming', label: 'Incoming Orders', emoji: '📥' },
    { key: 'outgoing', label: 'My Purchases',    emoji: '🛍️' },
  ];

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={18} className="text-sage-500" />
          <h1 className="text-xl font-bold text-warm-900">Orders</h1>
        </div>
        <p className="text-xs text-warm-400">Manage incoming requests and track your purchases</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-beige-200 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-sage-500 text-sage-600'
                : 'border-transparent text-warm-400 hover:text-warm-700'
            )}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4">
        {activeTab === 'incoming' && <OrdersTab mode="incoming" />}
        {activeTab === 'outgoing' && <OrdersTab mode="outgoing" />}
      </div>
    </div>
  );
}