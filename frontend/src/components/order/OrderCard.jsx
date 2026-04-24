/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Loader2,
  Package,
  Truck,
  XCircle,
} from 'lucide-react';
import { ordersAPI } from '../../services/api';
import { useTranslation } from '../../i18n/index.jsx';

export function formatDate(dateString, lang) {
  if (!dateString) {
    return '-';
  }

  return new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

function formatCurrency(value) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return `${Number(value).toLocaleString()} DA`;
}

export function StatusBadge({ status, size = 'sm' }) {
  const { t } = useTranslation();

  const config = {
    pending: {
      label: t('orders.statuses.pendingReview'),
      icon: Clock,
      color: 'text-warning',
      bg: 'bg-warning/10',
      ring: 'ring-warning/20',
    },
    accepted: {
      label: t('orders.statuses.accepted'),
      icon: CheckCircle2,
      color: 'text-sage-600',
      bg: 'bg-sage-50',
      ring: 'ring-sage-200',
    },
    rejected: {
      label: t('orders.statuses.rejected'),
      icon: XCircle,
      color: 'text-danger',
      bg: 'bg-red-50',
      ring: 'ring-red-100',
    },
    completed: {
      label: t('orders.statuses.completed'),
      icon: Package,
      color: 'text-warm-500',
      bg: 'bg-cream-200',
      ring: 'ring-beige-200',
    },
  };

  const resolved = config[status] ?? config.pending;
  const Icon = resolved.icon;

  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full ring-1 ${resolved.bg} ${resolved.color} ${resolved.ring} ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'}`}>
      <Icon size={size === 'sm' ? 10 : 12} />
      {resolved.label}
    </span>
  );
}

function DetailRow({ icon, label, value }) {
  if (!value) {
    return null;
  }

  const Icon = icon;

  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-beige-100 last:border-0">
      <div className="w-6 h-6 rounded-lg bg-cream-200 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={12} className="text-warm-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-warm-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-warm-800 mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  );
}

function ReferenceImages({ images }) {
  const { t } = useTranslation();

  if (!images?.length) {
    return null;
  }

  return (
    <div className="py-2 border-b border-beige-100">
      <p className="text-[10px] font-semibold text-warm-400 uppercase tracking-wider mb-2">
        {t('orders.card.referenceImages')}
      </p>
      <div className="flex gap-2 flex-wrap">
        {images.map((url, index) => (
          <a
            key={url || index}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="w-14 h-14 rounded-xl overflow-hidden border border-beige-200 block hover:opacity-80 transition-opacity"
          >
            <img src={url} alt={`reference-${index + 1}`} className="w-full h-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function OrderCard({ order, viewAs = 'client', onUpdated, defaultExpanded = false }) {
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [confirmAction, setConfirmAction] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const canAct = viewAs === 'seller' && order.status === 'pending';

  const deliveryLabels = useMemo(() => ({
    hand_to_hand: t('orders.card.deliveryLabels.hand_to_hand'),
    office_pickup: t('orders.card.deliveryLabels.office_pickup'),
    fast: t('orders.card.deliveryLabels.fast'),
  }), [t]);

  const paymentLabels = useMemo(() => ({
    cash_on_delivery: t('orders.card.paymentLabels.cash_on_delivery'),
    card: t('orders.card.paymentLabels.card'),
  }), [t]);

  const statusIconMap = {
    pending: Clock,
    accepted: CheckCircle2,
    rejected: XCircle,
    completed: Package,
  };

  const partyName = viewAs === 'client'
    ? (order.seller?.shop_name ?? order.sellers?.shop_name ?? t('orders.card.artisanFallback'))
    : (order.client_name ?? t('orders.card.customerFallback'));

  async function handleStatusChange(newStatus) {
    if (newStatus === 'rejected' && !rejectReason.trim()) {
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const payload = { status: newStatus };
      if (newStatus === 'rejected') {
        payload.rejection_reason = rejectReason.trim();
      }

      const response = await ordersAPI.updateStatus(order.id, payload);
      const updatedOrder = response.data?.data?.order ?? { ...order, status: newStatus };

      onUpdated?.(updatedOrder);
      setConfirmAction(null);
      setRejectReason('');
    } catch (requestError) {
      setError(requestError?.response?.data?.message ?? t('orders.card.updateError'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200 ${
      order.status === 'pending' && viewAs === 'seller'
        ? 'border-warning/40 shadow-sm'
        : 'border-beige-200'
    }`}
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-cream-100 transition-colors"
        onClick={() => setExpanded((current) => !current)}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          order.status === 'accepted'
            ? 'bg-sage-50'
            : order.status === 'rejected'
              ? 'bg-red-50'
              : order.status === 'completed'
                ? 'bg-cream-200'
                : 'bg-warning/10'
        }`}
        >
          {(() => {
            const StatusIcon = statusIconMap[order.status] ?? Clock;
            const statusColor = order.status === 'accepted'
              ? 'text-sage-600'
              : order.status === 'rejected'
                ? 'text-danger'
                : order.status === 'completed'
                  ? 'text-warm-500'
                  : 'text-warning';

            return <StatusIcon size={16} className={statusColor} />;
          })()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-warm-900 truncate">{partyName}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-[10px] text-warm-400 truncate">
            {order.notes
              ? order.notes.slice(0, 60) + (order.notes.length > 60 ? '...' : '')
              : t('orders.card.requestFallback')}
          </p>
          <p className="text-[10px] text-warm-300 mt-0.5">{formatDate(order.created_at, lang)}</p>
        </div>

        <div className="flex-shrink-0 text-warm-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-beige-100 space-y-0">
          {order.notes && (
            <DetailRow icon={Package} label={t('orders.card.orderDescription')} value={order.notes} />
          )}

          {(order.budget_min || order.budget_max) && (
            <DetailRow
              icon={Banknote}
              label={t('orders.card.clientBudget')}
              value={`${formatCurrency(order.budget_min)} - ${formatCurrency(order.budget_max)}`}
            />
          )}

          {order.deadline && (
            <DetailRow
              icon={CalendarDays}
              label={t('orders.card.requestedDeadline')}
              value={formatDate(order.deadline, lang)}
            />
          )}

          <DetailRow
            icon={Truck}
            label={t('orders.card.deliveryMethod')}
            value={deliveryLabels[order.delivery_type] ?? order.delivery_type}
          />

          <DetailRow
            icon={CreditCard}
            label={t('orders.card.paymentMethod')}
            value={paymentLabels[order.payment_method] ?? order.payment_method}
          />

          {viewAs === 'seller' && order.client_phone && (
            <DetailRow icon={Package} label={t('orders.card.clientPhone')} value={order.client_phone} />
          )}

          {viewAs === 'seller' && order.client_address && (
            <DetailRow icon={Truck} label={t('orders.card.deliveryAddress')} value={order.client_address} />
          )}

          <ReferenceImages images={order.reference_images} />

          {order.status === 'rejected' && order.rejection_reason && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-danger uppercase tracking-wider mb-1">
                {t('orders.card.rejectionReason')}
              </p>
              <p className="text-sm text-danger/80">{order.rejection_reason}</p>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-warm-400 pt-2">
            <Clock size={11} />
            {t('orders.card.placedOn', { date: formatDate(order.created_at, lang) })}
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-100 text-danger text-xs rounded-xl px-3 py-2">
              <AlertCircle size={12} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {canAct && (
            <div className="space-y-2 pt-3">
              {confirmAction === 'reject' && (
                <div>
                  <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider block mb-1.5">
                    {t('orders.card.rejectReason')} <span className="text-danger">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder={t('orders.card.rejectPlaceholder')}
                    rows={2}
                    className="w-full text-sm bg-cream-100 border border-beige-200 rounded-2xl px-3 py-2 outline-none focus:border-sage-400 resize-none transition-colors"
                  />
                </div>
              )}

              <div className="flex gap-2">
                {confirmAction !== 'reject' && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmAction('accept');
                      handleStatusChange('accepted');
                    }}
                    disabled={actionLoading}
                    className="flex-1 bg-sage-500 hover:bg-sage-600 text-white text-sm font-semibold py-2.5 rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {actionLoading && confirmAction === 'accept'
                      ? <Loader2 size={14} className="animate-spin" />
                      : <CheckCircle2 size={14} />}
                    {t('orders.card.accept')}
                  </button>
                )}

                {confirmAction === 'reject' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('rejected')}
                      disabled={actionLoading || !rejectReason.trim()}
                      className="flex-1 bg-danger hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-2xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {actionLoading
                        ? <Loader2 size={14} className="animate-spin" />
                        : <XCircle size={14} />}
                      {t('orders.card.confirmReject')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmAction(null);
                        setRejectReason('');
                        setError('');
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-cream-200 text-warm-600 text-sm font-medium hover:bg-beige-200 transition-colors"
                    >
                      {t('common.cancel')}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmAction('reject')}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-danger text-sm font-semibold py-2.5 rounded-2xl border border-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle size={14} />
                    {t('orders.card.reject')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
