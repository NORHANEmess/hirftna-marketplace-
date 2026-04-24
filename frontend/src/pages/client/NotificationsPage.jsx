import { useState, useEffect } from 'react';
import { Bell, Check, BellOff } from 'lucide-react';
import { extractApiItems, notificationsAPI } from '../../services/api';
import { formatRelativeTime } from '../../utils/formatPrice';
import { Spinner } from '../../components/ui/Spinner';

// ─── Notification type config — Arabic labels ─────────────────────────────────
const TYPE_CONFIG = {
  new_order:       { emoji: '📦', bg: 'bg-blue-50',    label: 'طلب جديد'       },
  order_received:  { emoji: '📦', bg: 'bg-blue-50',    label: 'طلب جديد'       },
  order_accepted:  { emoji: '✅', bg: 'bg-green-50',   label: 'تم قبول الطلب'  },
  order_rejected:  { emoji: '❌', bg: 'bg-red-50',     label: 'تم رفض الطلب'   },
  order_completed: { emoji: '🎉', bg: 'bg-purple-50',  label: 'اكتمل الطلب'    },
  message:         { emoji: '💬', bg: 'bg-cream-200',  label: 'رسالة'          },
  system:          { emoji: '🔔', bg: 'bg-cream-200',  label: 'إشعار'          },
};

function getConfig(type) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.system;
}

// ─── Single Notification Item ─────────────────────────────────────────────────
function NotifItem({ notif, onMarkRead }) {
  const config  = getConfig(notif.type);
  const isUnread = !notif.is_read;

  // Backend may send either `message` (single field) or `title` + `body` (split)
  // We support both shapes gracefully
  const title = notif.title   ?? notif.message ?? 'إشعار جديد';
  const body  = notif.body    ?? null;

  return (
    <div
      dir="rtl"
      onClick={() => isUnread && onMarkRead(notif.id)}
      className={`flex items-start gap-3 p-4 border-b border-beige-100 last:border-0
        transition-colors
        ${isUnread
          ? 'bg-sage-50 hover:bg-sage-100/60 cursor-pointer'
          : 'bg-white hover:bg-cream-50 cursor-default'
        }`}
    >
      {/* Type icon bubble */}
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
        <span className="text-lg">{config.emoji}</span>
      </div>

      {/* Text block */}
      <div className="flex-1 min-w-0">
        {/* Type label chip */}
        <span className="text-[9px] font-bold text-warm-400 uppercase tracking-wider">
          {config.label}
        </span>
        <p className={`text-sm leading-snug mt-0.5 mb-0.5
          ${isUnread ? 'font-semibold text-warm-900' : 'text-warm-600'}`}>
          {title}
        </p>
        {body && (
          <p className="text-xs text-warm-500 leading-relaxed mb-1">{body}</p>
        )}
        <p className="text-[10px] text-warm-400">
          {formatRelativeTime(notif.created_at)}
        </p>
      </div>

      {/* Unread dot — positioned on the left in RTL */}
      {isUnread && (
        <div className="w-2 h-2 bg-sage-500 rounded-full mt-1.5 flex-shrink-0" />
      )}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <p dir="rtl" className="text-[10px] font-bold text-warm-400 uppercase tracking-widest
      px-4 pt-4 pb-2">
      {children}
    </p>
  );
}

// ─── Skeleton items ───────────────────────────────────────────────────────────
function NotifSkeleton() {
  return (
    <div dir="rtl" className="flex items-start gap-3 p-4 border-b border-beige-100 animate-pulse">
      <div className="w-10 h-10 rounded-2xl bg-beige-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-2 bg-beige-200 rounded-full w-16" />
        <div className="h-3 bg-beige-200 rounded-full w-full" />
        <div className="h-2 bg-beige-200 rounded-full w-20" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [marking,       setMarking]       = useState(false);

  // ── Fetch all notifications on mount ──
  useEffect(() => {
    notificationsAPI.getAll({ limit: 50 })
      .then((res) => {
        // Standard backend response: { success: true, data: [...] }
        setNotifications(extractApiItems(res, { itemKeys: ['notifications'] }));
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Mark single notification as read — optimistic ──
  const handleMarkRead = async (id) => {
    // Flip state immediately so the dot disappears on tap without waiting for network
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    try {
      await notificationsAPI.markRead(id);
    } catch {
      // Revert if API call fails — keeps UI truthful
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: false } : n)
      );
    }
  };

  // ── Mark all as read ──
  const handleMarkAll = async () => {
    if (marking) return;
    setMarking(true);
    // Optimistic: mark everything read locally first
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await notificationsAPI.markAllRead();
    } catch {
      // If it fails, reload from server to get the real state
      notificationsAPI.getAll({ limit: 50 })
        .then(res => {
          setNotifications(extractApiItems(res, { itemKeys: ['notifications'] }));
        })
        .catch(() => {});
    } finally {
      setMarking(false);
    }
  };

  // Derived lists for New / Earlier sections
  const unread = notifications.filter(n => !n.is_read);
  const read   = notifications.filter(n =>  n.is_read);
  const unreadCount = unread.length;

  return (
    <div dir="rtl" className="min-h-screen bg-cream-100 pb-28 md:pb-10">

      {/* ── Page Header ── */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Bell size={18} className="text-sage-500" />
            <h1
              className="text-xl font-bold text-warm-900"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              الإشعارات
            </h1>
            {/* Unread count badge */}
            {unreadCount > 0 && (
              <span className="text-xs font-bold bg-sage-500 text-white px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-warm-400">
            {loading
              ? '...'
              : `${notifications.length} ${notifications.length === 1 ? 'إشعار' : 'إشعارات'}`
            }
          </p>
        </div>

        {/* Mark all read button — only shown when unread items exist */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={marking}
            className="flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-700
              bg-sage-50 border border-sage-100 px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <Check size={12} />
            {marking ? 'جارٍ التحديد...' : 'تحديد الكل كمقروء'}
          </button>
        )}
      </div>

      {/* ── Notification List Container ── */}
      <div className="mx-4 bg-white rounded-3xl border border-beige-200 overflow-hidden mb-4">

        {/* Loading state */}
        {loading && (
          <>
            {Array.from({ length: 5 }).map((_, i) => <NotifSkeleton key={i} />)}
          </>
        )}

        {/* Empty state — all caught up */}
        {!loading && notifications.length === 0 && (
          <div dir="rtl" className="flex flex-col items-center py-14 text-center px-4">
            <BellOff size={36} className="text-warm-300 mb-3" />
            <p
              className="text-sm font-semibold text-warm-700 mb-1"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              أنت على اطلاع بكل شيء!
            </p>
            <p className="text-xs text-warm-400">
              ستظهر هنا تحديثات الطلبات والتنبيهات
            </p>
          </div>
        )}

        {/* Notifications — split into "جديد" and "السابقة" ──────────────────── */}
        {!loading && notifications.length > 0 && (
          <>
            {/* ── Unread / New section ── */}
            {unread.length > 0 && (
              <div>
                <SectionLabel>جديد — {unread.length}</SectionLabel>
                {unread.map(n => (
                  <NotifItem key={n.id} notif={n} onMarkRead={handleMarkRead} />
                ))}
              </div>
            )}

            {/* ── Read / Earlier section ── */}
            {read.length > 0 && (
              <div>
                {/* Only show the "السابقة" label when there's also a "جديد" section above it */}
                {unread.length > 0 && <SectionLabel>السابقة</SectionLabel>}
                {read.map(n => (
                  <NotifItem key={n.id} notif={n} onMarkRead={handleMarkRead} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
