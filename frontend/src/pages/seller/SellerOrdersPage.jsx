import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Inbox, ShoppingBag } from 'lucide-react';
import { extractApiItems, ordersAPI } from '../../services/api';
import OrderCard from '../../components/order/OrderCard';
import RateClientModal from '../../components/order/RateClientModal';
import { useTranslation } from '../../i18n/index.jsx';
import DashboardSidebar from '../../components/layout/DashboardSidebar';

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

function EmptyState({ viewAs, hasFilter }) {
  const { t } = useTranslation();
  const isIncoming = viewAs === 'seller';

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
          ? t('orders.client.emptyFiltered')
          : isIncoming
            ? t('orders.seller.emptyIncoming')
            : t('orders.seller.emptyPurchases')}
      </p>
      <p className="text-warm-400 text-sm">
        {hasFilter
          ? t('orders.client.emptyFilteredDescription')
          : isIncoming
            ? t('orders.seller.emptyIncomingDescription')
            : t('orders.seller.emptyPurchasesDescription')}
      </p>
    </div>
  );
}

function OrdersList({ orders, loading, viewAs, statusFilter, onStatusFilter, onOrderUpdated }) {
  const { t } = useTranslation();
  const [ratingOrder, setRatingOrder] = useState(null); // order being rated

  const statusFilters = useMemo(() => ([
    { value: 'all',       label: t('orders.statuses.all') },
    { value: 'pending',   label: t('orders.statuses.pending') },
    { value: 'accepted',  label: t('orders.statuses.accepted') },
    { value: 'ready',     label: t('orders.statuses.ready') },
    { value: 'completed', label: t('orders.statuses.completed') },
    { value: 'rejected',  label: t('orders.statuses.rejected') },
  ]), [t]);

  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter((order) => order.status === statusFilter);

  return (
    <div>
      {!loading && orders.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2">
          {statusFilters.map((filter) => {
            const count = filter.value === 'all'
              ? orders.length
              : orders.filter((order) => order.status === filter.value).length;

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => onStatusFilter(filter.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all flex-shrink-0 ${
                  statusFilter === filter.value && filter.value === 'ready'
                    ? 'bg-info text-white border-info'
                    : statusFilter === filter.value
                      ? 'bg-sage-500 text-white border-sage-500'
                      : 'bg-white text-warm-500 border-beige-200 hover:border-sage-300'
                }`}
              >
                {filter.label}
                {count > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    statusFilter === filter.value ? 'bg-white/20 text-white' : 'bg-cream-200 text-warm-400'
                  }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => <OrderSkeleton key={index} />)
          : filteredOrders.length === 0
            ? <EmptyState viewAs={viewAs} hasFilter={statusFilter !== 'all'} />
            : filteredOrders.map((order) => (
              <div key={order.id}>
                <OrderCard
                  order={order}
                  viewAs={viewAs}
                  onUpdated={onOrderUpdated}
                />
                {/* Rate Client button — only for seller on completed incoming orders */}
                {viewAs === 'seller' && order.status === 'completed' && (
                  <RateClientButton order={order} onRate={() => setRatingOrder(order)} />
                )}
              </div>
            ))}
      </div>

      {ratingOrder && (
        <RateClientModal
          order={ratingOrder}
          onClose={() => setRatingOrder(null)}
          onRated={() => setRatingOrder(null)}
        />
      )}
    </div>
  );
}

function RateClientButton({ order, onRate }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onRate}
      className="w-full mt-1.5 py-2 text-xs font-semibold text-warm-500 bg-cream-100 hover:bg-beige-200 border border-beige-200 rounded-2xl transition-colors flex items-center justify-center gap-1.5"
    >
      ★ {t('orders.seller.rateClient')}
    </button>
  );
}

export default function SellerOrdersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('incoming');
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingIncoming, setLoadingIncoming] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [incomingError, setIncomingError] = useState(false);
  const purchasesLoaded = useRef(false);
  const [incomingFilter, setIncomingFilter] = useState('all');
  const [purchaseFilter, setPurchaseFilter] = useState('all');

  const loadIncoming = useCallback(async () => {
    setLoadingIncoming(true);
    setIncomingError(false);
    try {
      const response = await ordersAPI.getAll({ limit: 100 });
      setIncomingOrders(extractApiItems(response, { itemKeys: ['orders'] }));
    } catch {
      setIncomingOrders([]);
      setIncomingError(true);
    } finally {
      setLoadingIncoming(false);
    }
  }, []);

  const loadPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      const response = await ordersAPI.getAll({ as: 'client', limit: 100 });
      setPurchaseOrders(extractApiItems(response, { itemKeys: ['orders'] }));
    } catch {
      setPurchaseOrders([]);
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  useEffect(() => {
    loadIncoming();
  }, [loadIncoming]);

  useEffect(() => {
    if (activeTab === 'purchases' && !purchasesLoaded.current) {
      purchasesLoaded.current = true;
      loadPurchases();
    }
  }, [activeTab, loadPurchases]);

  const handleIncomingUpdated = (updatedOrder) => {
    setIncomingOrders((current) => current.map((order) => (
      order.id === updatedOrder.id ? updatedOrder : order
    )));
  };

  const handlePurchaseUpdated = (updatedOrder) => {
    setPurchaseOrders((current) => current.map((order) => (
      order.id === updatedOrder.id ? updatedOrder : order
    )));
  };

  // Orders needing seller action: pending (accept/reject) + accepted (mark as ready)
  const actionCount = incomingOrders.filter(
    (o) => o.status === 'pending' || o.status === 'accepted'
  ).length;

  const topTabs = [
    { value: 'incoming', label: t('orders.seller.incoming'), icon: Inbox, count: incomingOrders.length },
    { value: 'purchases', label: t('orders.seller.purchases'), icon: ShoppingBag, count: purchaseOrders.length },
  ];

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="seller" />
      <div className="flex-1 pb-28 md:pb-10">
      <div className="sticky top-14 z-30 bg-cream-100/95 backdrop-blur-sm border-b border-beige-100">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-warm-900">{t('orders.seller.title')}</h1>
              {actionCount > 0 && (
                <p className="text-xs text-warning font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
                  {t('orders.seller.pendingReview', { count: actionCount })}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-1.5 bg-cream-200 p-1 rounded-2xl border border-beige-200">
            {topTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  activeTab === tab.value
                    ? 'bg-sage-500 text-white shadow-sm'
                    : 'text-warm-500 hover:text-warm-800 hover:bg-cream-100'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.value ? 'bg-white/20 text-white' : 'bg-beige-200 text-warm-400'
                  }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        {incomingError && activeTab === 'incoming' && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-danger text-sm rounded-2xl px-4 py-3 mb-3">
            <Inbox size={15} className="flex-shrink-0 opacity-60" />
            <span className="flex-1">{t('common.error')}</span>
            <button onClick={loadIncoming} className="text-xs font-semibold underline underline-offset-2">
              {t('common.retry')}
            </button>
          </div>
        )}
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
    </div>
  );
}
