import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Search, Heart, ShoppingBag,
  User, Bell, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────
// NAV CONFIGS PER ROLE
// ─────────────────────────────────────────────────────────────
const VISITOR_NAV = [
  { icon: Home, label: 'Home', path: '/', auth: false },
  { icon: Search, label: 'Browse', path: '/browse', auth: false },
  { icon: Heart, label: 'Wishlist', path: '/wishlist', auth: true },
  { icon: User, label: 'Login', path: '/login', auth: false },
];

const CLIENT_NAV = [
  { icon: Home, label: 'Home', path: '/', auth: false },
  { icon: Search, label: 'Search', path: '/browse', auth: false },
  { icon: Heart, label: 'Wishlist', path: '/wishlist', auth: true },
  { icon: ShoppingBag, label: 'Orders', path: '/orders', auth: true },
  { icon: User, label: 'Profile', path: '/profile', auth: true },
];

const SELLER_NAV = [
  { icon: Home, label: 'Home', path: '/', auth: false },
  { icon: Search, label: 'Search', path: '/browse', auth: false },
  { icon: ClipboardList, label: 'Orders', path: '/seller/orders', auth: true },
  { icon: Bell, label: 'Notifs', path: '/notifications', auth: true },
  { icon: User, label: 'Profile', path: '/seller/dashboard', auth: true },
];

// ─────────────────────────────────────────────────────────────
// NAV ITEM
// ─────────────────────────────────────────────────────────────
function NavItem({ item, isActive, onClick, unreadCount }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer group"
      aria-label={item.label}
    >
      {/* Icon wrapper — capsule highlight on active */}
      <div
        className={clsx(
          'relative flex items-center justify-center w-12 h-7 rounded-full transition-all duration-300',
          isActive
            ? 'bg-sage-500 shadow-soft-sm'
            : 'bg-transparent group-hover:bg-cream-200'
        )}
      >
        <Icon
          size={18}
          strokeWidth={isActive ? 2.5 : 1.8}
          className={clsx(
            'transition-colors duration-200',
            isActive ? 'text-white' : 'text-warm-400'
          )}
        />
        {/* Notification badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-danger rounded-full flex items-center justify-center text-[8px] font-bold text-white leading-none border border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

      {/* Label */}
      <span
        className={clsx(
          'text-[9px] font-medium transition-colors duration-200',
          isActive ? 'text-sage-600' : 'text-warm-400'
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM NAV — MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function BottomNav({ unreadCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isSeller } = useAuth();

  // Pick nav based on role
  const navItems = isSeller
    ? SELLER_NAV
    : isAuthenticated
      ? CLIENT_NAV
      : VISITOR_NAV;

  const handleNav = (item) => {
    if (item.auth && !isAuthenticated) {
      navigate('/login');
    } else {
      navigate(item.path);
    }
  };

  // Active path detection (exact or prefix match)
  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    // Only visible on mobile (hidden md and above)
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      {/* ── Outer capsule container ───────────────────────── */}
      <div className="mx-3 mb-3">
        <div
          className="flex items-center bg-white/95 backdrop-blur-md border border-beige-200 rounded-[28px] shadow-soft-lg px-1 py-1"
          style={{ boxShadow: '0 8px 32px rgba(60, 50, 30, 0.14)' }}
        >
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isActive={isActive(item.path)}
              onClick={() => handleNav(item)}
              unreadCount={
                (item.label === 'Notifs' || item.label === 'Notifications')
                  ? unreadCount
                  : 0
              }
            />
          ))}
        </div>
      </div>
    </nav>
  );
}