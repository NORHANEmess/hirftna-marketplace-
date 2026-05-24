import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { extractApiEntity, notificationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MainLayout() {
  const { isAuthenticated, loading: authLoading, clearSession } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return undefined;
    }

    let cancelled = false;
    let interval = null;

    const fetchCount = () => {
      notificationsAPI.getUnreadCount()
        .then((res) => {
          if (cancelled) return;
          const payload = extractApiEntity(res) ?? {};
          const count = payload.unreadCount ?? payload.count ?? 0;
          setUnreadCount(Number(count));
        })
        .catch((err) => {
          if (cancelled) return;
          if (err?.response?.status === 401) {
            clearSession();
          }
        });
    };

    const startPolling = () => {
      fetchCount();
      interval = setInterval(fetchCount, 120_000); // 2 minutes — notifications aren't instant-critical
    };

    const stopPolling = () => {
      clearInterval(interval);
      interval = null;
    };

    const handleVisibility = () => {
      if (document.hidden) stopPolling();
      else startPolling();
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, authLoading, clearSession]);

  const visibleUnreadCount = isAuthenticated ? unreadCount : 0;

  return (
    <div className="min-h-screen bg-cream-100">
      <TopBar unreadCount={visibleUnreadCount} />
      <main>
        <Outlet />
      </main>
      <BottomNav unreadCount={visibleUnreadCount} />
    </div>
  );
}
