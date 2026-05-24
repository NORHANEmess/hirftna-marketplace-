import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, CheckCircle2, Gift, Package, Star, XCircle } from 'lucide-react';
import { extractApiItems, notificationsAPI } from '../services/api';
import Toast from '../components/ui/Toast';
import { formatRelativeTime } from '../utils/formatPrice';
import { Spinner } from '../components/ui/Spinner';
import { useTranslation } from '../i18n/index.jsx';
import { getNotificationText } from '../utils/notificationText';

// ─── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  new_order:       { Icon: Package,      bg: 'bg-blue-50',   iconColor: 'text-blue-500'   },
  order_received:  { Icon: Package,      bg: 'bg-blue-50',   iconColor: 'text-blue-500'   },
  order_accepted:  { Icon: CheckCircle2, bg: 'bg-sage-50',   iconColor: 'text-sage-500'   },
  order_rejected:  { Icon: XCircle,      bg: 'bg-red-50',    iconColor: 'text-danger'      },
  order_ready:     { Icon: Gift,         bg: 'bg-indigo-50', iconColor: 'text-indigo-500' },
  order_completed: { Icon: Star,         bg: 'bg-purple-50', iconColor: 'text-purple-500' },
  system:          { Icon: Bell,         bg: 'bg-cream-200', iconColor: 'text-warm-500'   },
};

// ─── Single Notification Item ─────────────────────────────────────────────────
function NotifItem({ notif, onMarkRead }) {
  const { t, lang } = useTranslation();
  const config  = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
  const { Icon } = config;
  const isUnread = !notif.is_read;

  const { title, body } = getNotificationText(notif, t);

  return (
    <div
      onClick={() => isUnread && onMarkRead(notif.id)}
      className={`flex items-start gap-3 p-4 border-b border-beige-100 last:border-0
        transition-colors ${isUnread
          ? 'bg-sage-50 hover:bg-sage-100/60 cursor-pointer'
          : 'bg-white hover:bg-cream-50 cursor-default'
        }`}
    >
      {/* Icon bubble */}
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
        <Icon size={18} className={config.iconColor} />
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug mb-0.5 ${isUnread ? 'font-semibold text-warm-900' : 'text-warm-700'}`}>
          {title}
        </p>
        {body && (
          <p className="text-xs text-warm-500 leading-relaxed mb-1">{body}</p>
        )}
        <p className="text-[10px] text-warm-400">{formatRelativeTime(notif.created_at, t, lang)}</p>
      </div>

      {/* Unread indicator dot */}
      {isUnread && (
        <div className="w-2 h-2 bg-brick-500 rounded-full mt-1.5 flex-shrink-0" />
      )}
    </div>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold text-warm-400 uppercase tracking-widest px-4 pt-4 pb-2">
      {children}
    </p>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [marking,       setMarking]       = useState(false);
  const [toast,         setToast]         = useState(null);

  useEffect(() => {
    notificationsAPI.getAll({ limit: 30 })
      .then((res) => {
        setNotifications(extractApiItems(res, { itemKeys: ['notifications'] }));
      })
      .catch(() => {
        setNotifications([]);
        setToast({ message: t('common.error'), type: 'error' });
      })
      .finally(() => setLoading(false));
  }, [t]);

  // ── Mark single as read — optimistic update ──
  const handleMarkRead = async (id) => {
    // Update state immediately so the dot disappears on tap without waiting
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
    );
    try {
      await notificationsAPI.markRead(id);
    } catch {
      // Revert if the API call fails
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: false } : n)
      );
    }
  };

  // ── Mark all as read ──
  const handleMarkAll = async () => {
    if (marking) return;
    setMarking(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await notificationsAPI.markAllRead();
    } catch {
      // Reload from server if something went wrong
      notificationsAPI.getAll({ limit: 30 })
        .then((res) => {
          setNotifications(extractApiItems(res, { itemKeys: ['notifications'] }));
        })
        .catch(() => {});
    } finally {
      setMarking(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const unread      = notifications.filter((n) => !n.is_read);
  const read        = notifications.filter((n) =>  n.is_read);

  return (
    <div className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Page Header ── */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Bell size={18} className="text-sage-500" />
            <h1 className="text-xl font-bold text-warm-900">{t('notifications.title')}</h1>
            {unreadCount > 0 && (
              <span className="text-xs font-bold bg-brick-500 text-white px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-warm-400">
            {loading
              ? '...'
              : `${notifications.length} ${notifications.length === 1 ? t('notifications.count_one') : t('notifications.count_other')}`
            }
          </p>
        </div>

        {/* Mark all read button — only shown when there are unread items */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={marking}
            className="flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-700
              bg-sage-50 border border-sage-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Check size={12} />
            {marking ? t('notifications.marking') : t('notifications.markAllRead')}
          </button>
        )}
      </div>

      {/* ── Notification List ── */}
      <div className="mx-4 bg-white rounded-3xl border border-beige-200 overflow-hidden mb-4">

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {/* Empty state */}
        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center py-14 text-center px-4">
            <BellOff size={36} className="text-warm-300 mb-3" />
            <p className="text-sm font-semibold text-warm-700 mb-1">{t('notifications.empty')}</p>
            <p className="text-xs text-warm-400">{t('notifications.emptySub')}</p>
          </div>
        )}

        {/* Notifications — split into New and Earlier sections */}
        {!loading && notifications.length > 0 && (
          <>
            {/* New (unread) section */}
            {unread.length > 0 && (
              <div>
                <SectionLabel>{t('notifications.sectionNew', { count: unread.length })}</SectionLabel>
                {unread.map((notif) => (
                  <NotifItem key={notif.id} notif={notif} onMarkRead={handleMarkRead} />
                ))}
              </div>
            )}

            {/* Earlier (read) section */}
            {read.length > 0 && (
              <div>
                {/* Only show "Earlier" label if there's also a "New" section above */}
                {unread.length > 0 && <SectionLabel>{t('notifications.sectionEarlier')}</SectionLabel>}
                {read.map((notif) => (
                  <NotifItem key={notif.id} notif={notif} onMarkRead={handleMarkRead} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
