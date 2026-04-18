import { useState } from 'react';
import {
  ChevronDown, ChevronUp, Clock, CheckCircle2,
  XCircle, Package, Truck, CreditCard, Banknote,
  CalendarDays, ImageIcon, Loader2, AlertCircle,
} from 'lucide-react';
import { ordersAPI } from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatCurrency(val) {
  if (!val && val !== 0) return '—';
  return `${Number(val).toLocaleString()} DA`;
}

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  pending:   {
    label: 'Pending Review',
    icon:  Clock,
    color: 'text-warning',
    bg:    'bg-warning/10',
    ring:  'ring-warning/20',
  },
  accepted:  {
    label: 'Accepted',
    icon:  CheckCircle2,
    color: 'text-sage-600',
    bg:    'bg-sage-50',
    ring:  'ring-sage-200',
  },
  rejected:  {
    label: 'Rejected',
    icon:  XCircle,
    color: 'text-danger',
    bg:    'bg-red-50',
    ring:  'ring-red-100',
  },
  completed: {
    label: 'Completed',
    icon:  Package,
    color: 'text-warm-500',
    bg:    'bg-cream-200',
    ring:  'ring-beige-200',
  },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status, size = 'sm' }) {
  const cfg  = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-full ring-1
      ${cfg.bg} ${cfg.color} ${cfg.ring}
      ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'}`}>
      <Icon size={size === 'sm' ? 10 : 12} />
      {cfg.label}
    </span>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
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

// ─── Reference Images ─────────────────────────────────────────────────────────
function ReferenceImages({ images }) {
  if (!images?.length) return null;
  return (
    <div className="py-2 border-b border-beige-100">
      <p className="text-[10px] font-semibold text-warm-400 uppercase tracking-wider mb-2">
        Reference Images
      </p>
      <div className="flex gap-2 flex-wrap">
        {images.map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noreferrer"
            className="w-14 h-14 rounded-xl overflow-hidden border border-beige-200 block hover:opacity-80 transition-opacity">
            <img src={url} alt={`ref ${i + 1}`} className="w-full h-full object-cover" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main OrderCard ───────────────────────────────────────────────────────────
/**
 * Props:
 *  order       — the full order object from the API
 *  viewAs      — 'client' | 'seller'  controls which actions are shown
 *  onUpdated   — callback(updatedOrder) when seller accepts/rejects
 */
export default function OrderCard({ order, viewAs = 'client', onUpdated }) {
  const [expanded,       setExpanded]       = useState(false);
  const [confirmAction,  setConfirmAction]  = useState(null); // 'accept' | 'reject' | null
  const [rejectReason,   setRejectReason]   = useState('');
  const [actionLoading,  setActionLoading]  = useState(false);
  const [error,          setError]          = useState('');

  // Seller can act only on pending orders
  const canAct = viewAs === 'seller' && order.status === 'pending';

  // ── Delivery & payment labels ──
  const DELIVERY_LABELS = {
    hand_to_hand:  'Hand to Hand',
    office_pickup: 'Office Pickup',
    fast:          'Fast Delivery',
  };
  const PAYMENT_LABELS = {
    cash_on_delivery: 'Cash on Delivery',
    card:             'Card Payment',
  };

  async function handleStatusChange(newStatus) {
    if (newStatus === 'rejected' && !rejectReason.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      const payload = { status: newStatus };
      if (newStatus === 'rejected') payload.rejection_reason = rejectReason.trim();
      const res = await ordersAPI.updateStatus(order.id, payload);
      const updated = res.data?.data ?? { ...order, status: newStatus };
      onUpdated?.(updated);
      setConfirmAction(null);
      setRejectReason('');
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Failed to update order');
    } finally {
      setActionLoading(false);
    }
  }

  // Party names shown in the card header
  const partyName = viewAs === 'client'
    ? (order.seller?.shop_name ?? order.sellers?.shop_name ?? 'Artisan')
    : (order.client_name ?? 'Customer');

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all duration-200
      ${order.status === 'pending' && viewAs === 'seller'
        ? 'border-warning/40 shadow-sm'
        : 'border-beige-200'
      }`}>

      {/* ── Card Header (always visible) ── */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-cream-100 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Status icon bubble */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${STATUS_CONFIG[order.status]?.bg ?? 'bg-cream-200'}`}>
          {(() => {
            const Icon = STATUS_CONFIG[order.status]?.icon ?? Clock;
            return <Icon size={16} className={STATUS_CONFIG[order.status]?.color ?? 'text-warm-400'} />;
          })()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="text-sm font-bold text-warm-900 truncate">{partyName}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-[10px] text-warm-400 truncate">
            {order.notes
              ? order.notes.slice(0, 60) + (order.notes.length > 60 ? '…' : '')
              : 'Custom order request'
            }
          </p>
          <p className="text-[10px] text-warm-300 mt-0.5">{formatDate(order.created_at)}</p>
        </div>

        {/* Expand chevron */}
        <div className="flex-shrink-0 text-warm-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* ── Expanded Detail Panel ── */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-beige-100 space-y-0">

          {/* Order description */}
          {order.notes && (
            <DetailRow icon={Package} label="Order Description" value={order.notes} />
          )}

          {/* Budget */}
          {(order.budget_min || order.budget_max) && (
            <DetailRow
              icon={Banknote}
              label="Client Budget"
              value={`${formatCurrency(order.budget_min)} – ${formatCurrency(order.budget_max)}`}
            />
          )}

          {/* Deadline */}
          {order.deadline && (
            <DetailRow icon={CalendarDays} label="Requested Deadline" value={formatDate(order.deadline)} />
          )}

          {/* Delivery */}
          <DetailRow
            icon={Truck}
            label="Delivery Method"
            value={DELIVERY_LABELS[order.delivery_type] ?? order.delivery_type}
          />

          {/* Payment */}
          <DetailRow
            icon={CreditCard}
            label="Payment Method"
            value={PAYMENT_LABELS[order.payment_method] ?? order.payment_method}
          />

          {/* Contact info (seller sees this, client doesn't need it) */}
          {viewAs === 'seller' && order.client_phone && (
            <DetailRow icon={Package} label="Client Phone" value={order.client_phone} />
          )}
          {viewAs === 'seller' && order.client_address && (
            <DetailRow icon={Truck} label="Delivery Address" value={order.client_address} />
          )}

          {/* Reference images */}
          <ReferenceImages images={order.reference_images} />

          {/* Rejection reason (if rejected) */}
          {order.status === 'rejected' && order.rejection_reason && (
            <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold text-danger uppercase tracking-wider mb-1">
                Rejection Reason
              </p>
              <p className="text-sm text-danger/80">{order.rejection_reason}</p>
            </div>
          )}

          {/* Placed date */}
          <div className="flex items-center gap-1.5 text-xs text-warm-400 pt-2">
            <Clock size={11} />
            Placed on {formatDate(order.created_at)}
          </div>

          {/* API error */}
          {error && (
            <div className="flex items-center gap-2 mt-2 bg-red-50 border border-red-100
              text-danger text-xs rounded-xl px-3 py-2">
              <AlertCircle size={12} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── SELLER ACTIONS (pending orders only) ── */}
          {canAct && (
            <div className="space-y-2 pt-3">

              {/* Rejection reason textarea — only shown when confirming reject */}
              {confirmAction === 'reject' && (
                <div>
                  <label className="text-[10px] font-semibold text-warm-500 uppercase tracking-wider block mb-1.5">
                    Reason for Rejection <span className="text-danger">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Explain why you cannot fulfil this order..."
                    rows={2}
                    className="w-full text-sm bg-cream-100 border border-beige-200 rounded-2xl
                      px-3 py-2 outline-none focus:border-sage-400 resize-none transition-colors"
                  />
                </div>
              )}

              <div className="flex gap-2">
                {/* Accept button — hidden when in reject confirmation mode */}
                {confirmAction !== 'reject' && (
                  <button
                    onClick={() => {
                      setConfirmAction('accept');
                      handleStatusChange('accepted');
                    }}
                    disabled={actionLoading}
                    className="flex-1 bg-sage-500 hover:bg-sage-600 text-white text-sm
                      font-semibold py-2.5 rounded-2xl transition-colors disabled:opacity-60
                      flex items-center justify-center gap-2"
                  >
                    {actionLoading && confirmAction === 'accept'
                      ? <Loader2 size={14} className="animate-spin" />
                      : <CheckCircle2 size={14} />
                    }
                    Accept Order
                  </button>
                )}

                {/* Reject flow */}
                {confirmAction === 'reject' ? (
                  <>
                    <button
                      onClick={() => handleStatusChange('rejected')}
                      disabled={actionLoading || !rejectReason.trim()}
                      className="flex-1 bg-danger hover:bg-red-700 text-white text-sm font-semibold
                        py-2.5 rounded-2xl transition-colors disabled:opacity-60
                        flex items-center justify-center gap-2"
                    >
                      {actionLoading
                        ? <Loader2 size={14} className="animate-spin" />
                        : <XCircle size={14} />
                      }
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => { setConfirmAction(null); setRejectReason(''); setError(''); }}
                      className="px-4 py-2.5 rounded-2xl bg-cream-200 text-warm-600 text-sm
                        font-medium hover:bg-beige-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmAction('reject')}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-danger text-sm font-semibold
                      py-2.5 rounded-2xl border border-red-100 transition-colors
                      flex items-center justify-center gap-2"
                  >
                    <XCircle size={14} /> Reject
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