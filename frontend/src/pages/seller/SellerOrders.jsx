import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { ClipboardList } from 'lucide-react';
import { extractApiItems, extractApiPagination, ordersAPI } from '../../services/api';
import OrderCard from '../../components/order/OrderCard';
import { Spinner } from '../../components/ui/Spinner';
import { useTranslation } from '../../i18n/index.jsx';
import DashboardSidebar from '../../components/layout/DashboardSidebar';

function OrdersTab({ mode }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const STATUS_FILTERS = [
    { value: '',          label: t('orders.statuses.all')       },
    { value: 'pending',   label: t('orders.statuses.pending')   },
    { value: 'accepted',  label: t('orders.statuses.accepted')  },
    { value: 'completed', label: t('orders.statuses.completed') },
    { value: 'rejected',  label: t('orders.statuses.rejected')  },
  ];

  const fetchOrders = useCallback(async (nextPage = 1, append = false) => {
    setLoading(true);
    try {
      const response = await ordersAPI.getAll({
        page: nextPage,
        limit: 10,
        status: statusFilter || undefined,
        as: mode === 'outgoing' ? 'client' : undefined,
      });

      const nextOrders = extractApiItems(response, { itemKeys: ['orders'] });
      const nextTotal = extractApiPagination(response, { itemKeys: ['orders'] })?.total ?? nextOrders.length;

      setOrders((current) => append ? [...current, ...nextOrders] : nextOrders);
      setTotal(nextTotal);
    } catch {
      if (!append) {
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, statusFilter]);

  useEffect(() => {
    setPage(1);
    fetchOrders(1, false);
  }, [fetchOrders]);

  const handleOrderUpdated = (updatedOrder) => {
    setOrders((current) => current.map((order) => (
      order.id === updatedOrder.id ? updatedOrder : order
    )));
  };

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-3">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setStatusFilter(filter.value)}
            className={clsx(
              'flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
              statusFilter === filter.value
                ? 'bg-sage-500 text-white border-sage-500'
                : 'bg-white text-warm-600 border-beige-200 hover:border-sage-300'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 pb-4">
        {loading && orders.length === 0 ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 skeleton rounded-3xl" />
          ))
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <span className="text-5xl mb-3">{mode === 'incoming' ? '📭' : '🛍️'}</span>
            <p className="text-sm font-semibold text-warm-700 mb-1">
              {mode === 'incoming' ? t('orders.seller.emptyIncoming') : t('orders.seller.emptyPurchases')}
            </p>
            <p className="text-xs text-warm-400">
              {mode === 'incoming'
                ? statusFilter ? t('orders.client.emptyFiltered') : t('orders.seller.emptyIncomingDescription')
                : t('orders.seller.emptyPurchasesDescription')
              }
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              viewAs={mode === 'incoming' ? 'seller' : 'client'}
              onUpdated={handleOrderUpdated}
            />
          ))
        )}

        {!loading && orders.length < total && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchOrders(nextPage, true);
              }}
              className="btn-outline px-6 py-2 text-sm"
            >
              {t('browse.loadMore')}
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

export default function SellerOrdersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('incoming');
  const tabs = [
    { key: 'incoming', label: t('orders.seller.incomingTab'), emoji: '📥' },
    { key: 'outgoing', label: t('orders.seller.purchases'),   emoji: '🛍️' },
  ];

  return (
    <div className="min-h-screen bg-cream-100 md:flex">
      <DashboardSidebar role="seller" />
      <div className="flex-1 pb-28 md:pb-10">
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={18} className="text-sage-500" />
          <h1 className="text-xl font-bold text-warm-900">{t('orders.seller.title')}</h1>
        </div>
        <p className="text-xs text-warm-400">{t('orders.seller.subtitle')}</p>
      </div>

      <div className="flex border-b border-beige-200 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
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

      <div className="px-4">
        {activeTab === 'incoming' && <OrdersTab mode="incoming" />}
        {activeTab === 'outgoing' && <OrdersTab mode="outgoing" />}
      </div>
      </div>
    </div>
  );
}
