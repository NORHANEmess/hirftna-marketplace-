import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Package, ShoppingBag } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { extractApiItems, ordersAPI } from '../../services/api';
import OrderCard from '../../components/order/OrderCard';
import { useTranslation } from '../../i18n/index.jsx';

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

function EmptyState({ hasFilter }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 bg-cream-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <Package size={26} className="text-warm-300" />
      </div>
      <p className="text-warm-800 font-semibold mb-1">
        {hasFilter ? t('orders.client.emptyFiltered') : t('orders.client.empty')}
      </p>
      <p className="text-warm-400 text-sm mb-6">
        {hasFilter ? t('orders.client.emptyFilteredDescription') : t('orders.client.emptyDescription')}
      </p>
      {!hasFilter && (
        <button
          type="button"
          onClick={() => navigate('/browse')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white text-sm font-semibold rounded-2xl hover:bg-sage-600 transition-colors"
        >
          <ShoppingBag size={15} />
          {t('orders.client.browse')}
        </button>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const highlightId = searchParams.get('id') ?? null;

  const statusTabs = useMemo(() => ([
    { value: 'all',       label: t('orders.statuses.all') },
    { value: 'pending',   label: t('orders.statuses.pending') },
    { value: 'accepted',  label: t('orders.statuses.accepted') },
    { value: 'ready',     label: t('orders.statuses.ready') },
    { value: 'completed', label: t('orders.statuses.completed') },
    { value: 'rejected',  label: t('orders.statuses.rejected') },
  ]), [t]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ordersAPI.getAll({ limit: 100 });
      setOrders(extractApiItems(response, { itemKeys: ['orders'] }));
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter((order) => order.status === activeTab);

  const handleOrderUpdated = (updatedOrder) => {
    setOrders((current) => current.map((order) => (
      order.id === updatedOrder.id ? updatedOrder : order
    )));
  };

  // Count orders that need client action: ready = final price set, waiting for confirmation
  const actionCount = orders.filter((o) => o.status === 'pending' || o.status === 'ready').length;

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-warm-900">{t('orders.client.title')}</h1>
              <p className="text-xs text-warm-400">
                {loading ? t('common.loading') : t('orders.client.summary', { count: orders.length })}
                {actionCount > 0 && (
                  <span className="text-warning font-semibold">
                    {` · ${t('orders.client.pendingSummary', { count: actionCount })}`}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {statusTabs.map((tab) => {
              const count = tab.value === 'all'
                ? orders.length
                : orders.filter((order) => order.status === tab.value).length;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-150 flex-shrink-0 ${
                    activeTab === tab.value && tab.value === 'ready'
                      ? 'bg-info text-white border-info shadow-sm'
                      : activeTab === tab.value
                        ? 'bg-sage-500 text-white border-sage-500 shadow-sm'
                        : tab.value === 'ready' && orders.filter((o) => o.status === 'ready').length > 0
                          ? 'bg-blue-50 text-info border-blue-200 hover:border-info'
                          : 'bg-white text-warm-500 border-beige-200 hover:border-sage-300'
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-cream-200 text-warm-400'
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

      <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
        {error ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-danger text-sm rounded-2xl px-4 py-3">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={loadOrders} className="text-xs font-semibold underline underline-offset-2">
              {t('common.retry')}
            </button>
          </div>
        ) : loading
          ? Array.from({ length: 4 }).map((_, index) => <OrderSkeleton key={index} />)
          : filteredOrders.length === 0
            ? <EmptyState hasFilter={activeTab !== 'all'} />
            : filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                viewAs="client"
                onUpdated={handleOrderUpdated}
                defaultExpanded={highlightId === order.id}
              />
            ))}
      </div>
    </div>
  );
}
