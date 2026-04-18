import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart, ShoppingBag, Bell, User,
  ChevronDown, LogOut, Settings,
  LayoutDashboard, ClipboardList,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// ICON BUTTON (wishlist, orders, notifications)
// ─────────────────────────────────────────────────────────────
function IconBtn({ icon, to, label, badge = 0, onClick }) {
  const Icon = icon;
  const location = useLocation();
  const isActive = to ? location.pathname.startsWith(to) : false;

  const content = (
    <div
      className={clsx(
        'relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200',
        isActive
          ? 'bg-sage-100 text-sage-600'
          : 'text-warm-500 hover:bg-cream-200 hover:text-warm-800'
      )}
      title={label}
    >
      <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-danger rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none border-2 border-cream-100">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
  );

  if (onClick) return <button type="button" onClick={onClick}>{content}</button>;
  if (to) return <Link to={to} aria-label={label}>{content}</Link>;
  return content;
}

// ─────────────────────────────────────────────────────────────
// PROFILE DROPDOWN
// ─────────────────────────────────────────────────────────────
function ProfileDropdown({ user, isSeller, onLogout }) {
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const menuItems = isSeller
    ? [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/seller/dashboard' },
      { icon: ClipboardList, label: 'Manage Orders', path: '/seller/orders' },
      { icon: Settings, label: 'Shop Settings', path: '/seller/profile' },
    ]
    : [
      { icon: User, label: 'My Profile', path: '/profile' },
      { icon: ShoppingBag, label: 'My Orders', path: '/orders' },
      { icon: Heart, label: 'Wishlist', path: '/wishlist' },
    ];

  return (
    <div ref={dropRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 group"
      >
        {/* Avatar */}
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className="w-8 h-8 rounded-full object-cover border-2 border-beige-200 group-hover:border-sage-400 transition-colors"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center text-white text-xs font-bold border-2 border-transparent group-hover:border-sage-300 transition-colors">
            {initials}
          </div>
        )}
        <ChevronDown
          size={13}
          className={clsx(
            'text-warm-400 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-2xl shadow-soft-lg border border-beige-200 overflow-hidden z-50 animate-slide-down">
          {/* User info */}
          <div className="px-4 py-3 border-b border-beige-100">
            <p className="text-sm font-semibold text-warm-900 truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-warm-400 truncate">{user?.email}</p>
            {isSeller && (
              <span className="inline-block mt-1 text-[10px] font-medium bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">
                Seller Account
              </span>
            )}
          </div>

          {/* Menu items */}
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.label}
              onClick={() => { navigate(item.path); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-warm-700 hover:bg-cream-100 hover:text-sage-700 transition-colors text-left"
            >
              <item.icon size={15} className="text-warm-400" />
              {item.label}
            </button>
          ))}

          {/* Logout */}
          <div className="border-t border-beige-100">
            <button
              type="button"
              onClick={() => { onLogout(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors text-left"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DESKTOP NAV — right side icons + profile
// Hidden on mobile (shown md and above)
// ─────────────────────────────────────────────────────────────
export default function DesktopNav({ unreadCount = 0 }) {
  const { user, isAuthenticated, isSeller, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="hidden md:flex items-center gap-1.5">
      {isAuthenticated ? (
        <>
          {/* Wishlist */}
          <IconBtn
            icon={Heart}
            to="/wishlist"
            label="Wishlist"
          />

          {/* Orders */}
          <IconBtn
            icon={isSeller ? ClipboardList : ShoppingBag}
            to={isSeller ? '/seller/orders' : '/orders'}
            label="Orders"
          />

          {/* Notifications */}
          <IconBtn
            icon={Bell}
            to="/notifications"
            label="Notifications"
            badge={unreadCount}
          />

          {/* Profile dropdown */}
          <div className="ml-1">
            <ProfileDropdown
              user={user}
              isSeller={isSeller}
              onLogout={handleLogout}
            />
          </div>
        </>
      ) : (
        /* Guest: login + register */
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm font-medium text-warm-600 hover:text-sage-600 transition-colors px-3 py-2 rounded-full hover:bg-cream-200"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="btn-primary btn-sm text-sm"
          >
            Join Hirftna
          </Link>
        </div>
      )}
    </div>
  );
}
