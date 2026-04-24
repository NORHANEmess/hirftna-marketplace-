import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { extractApiEntity, notificationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function MainLayout() {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let cancelled = false;

    const fetchCount = () => {
      notificationsAPI.getUnreadCount()
        .then((res) => {
          if (cancelled) {
            return;
          }

          const payload = extractApiEntity(res) ?? {};
          const count = payload.unreadCount ?? payload.count ?? 0;
          setUnreadCount(Number(count));
        })
        .catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

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
