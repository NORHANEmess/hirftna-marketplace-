import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';

// ─────────────────────────────────────────────────────────────
// MAIN LAYOUT
// ─────────────────────────────────────────────────────────────
// Structure:
//   <TopBar>   ← sticky, contains logo + search + DesktopNav
//   <main>     ← page content, padded bottom for mobile nav
//   <BottomNav> ← mobile only, fixed floating pill
// ─────────────────────────────────────────────────────────────
export default function MainLayout() {
  const { isAuthenticated }         = useAuth();
  const location                    = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread notification count — refreshes on route change
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    notificationsAPI
      .getUnreadCount()
      .then((res) => {
        const count = res.data?.data?.unreadCount ?? res.data?.data?.count ?? 0;
        setUnreadCount(Number(count));
      })
      .catch(() => {}); // silent — badge just stays at 0
  }, [isAuthenticated, location.pathname]);

  return (
    <div className="min-h-screen bg-cream-100">
      {/* ── Top bar (sticky, full width) ─────────────────── */}
      <TopBar unreadCount={unreadCount} />

      {/* ── Page content ─────────────────────────────────── */}
      {/*
        - pb-28 on mobile: leaves room for the floating bottom nav
        - md:pb-0: on desktop there is no bottom nav
        - max-w-md + mx-auto on mobile centres the content
        - md:max-w-none: desktop uses full width
      */}
      <main className="pb-28 md:pb-8 max-w-md mx-auto md:max-w-none">
        <Outlet />
      </main>

      {/* ── Bottom nav (mobile only, hidden md+) ─────────── */}
      <BottomNav unreadCount={unreadCount} />
    </div>
  );
}