import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  User,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n/index.jsx';

function IconButton({ icon, to, label, badge = 0, onClick, light = false }) {
  const Icon = icon;
  const location = useLocation();
  const isActive = to ? location.pathname.startsWith(to) : false;

  const content = (
    <div
      className={clsx(
        'relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200',
        light
          ? 'text-white/80 hover:bg-white/15 hover:text-white'
          : isActive
            ? 'bg-sage-100 text-sage-600'
            : 'text-warm-500 hover:bg-cream-200 hover:text-warm-800'
      )}
      title={label}
    >
      <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
      {badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-brick-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none border-2 border-cream-100">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </div>
  );

  if (onClick) {
    return <button type="button" onClick={onClick}>{content}</button>;
  }

  if (to) {
    return <Link to={to} aria-label={label}>{content}</Link>;
  }

  return content;
}

function ProfileDropdown({ user, isAdmin, isSeller, onLogout }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((name) => name[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const menuItems = isAdmin
    ? [
      { icon: LayoutDashboard, label: t('admin.dashboard'), path: '/admin' },
      { icon: Users, label: t('admin.users'), path: '/admin/users' },
      { icon: Package, label: t('admin.products'), path: '/admin/products' },
      { icon: Tag, label: t('admin.categories.title'), path: '/admin/categories' },
      { icon: User, label: t('desktopNav.myProfile'), path: '/profile' },
    ]
    : isSeller
      ? [
        { icon: LayoutDashboard, label: t('desktopNav.dashboard'), path: '/seller/dashboard' },
        { icon: ClipboardList, label: t('desktopNav.manageOrders'), path: '/seller/orders' },
        { icon: Settings, label: t('desktopNav.shopSettings'), path: '/seller/profile' },
      ]
      : [
        { icon: User, label: t('desktopNav.myProfile'), path: '/profile' },
        { icon: ShoppingBag, label: t('desktopNav.myOrders'), path: '/orders' },
        { icon: Heart, label: t('desktopNav.wishlist'), path: '/wishlist' },
      ];

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 group"
      >
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
        <div className="absolute top-full end-0 mt-2 w-52 bg-white rounded-2xl shadow-soft-lg border border-beige-200 overflow-hidden z-50 animate-slide-down">
          <div className="px-4 py-3 border-b border-beige-100">
            <p className="text-sm font-semibold text-warm-900 truncate">
              {user?.full_name || t('desktopNav.myProfile')}
            </p>
            <p className="text-xs text-warm-400 truncate">{user?.email}</p>
            {isAdmin && (
              <span className="inline-block mt-1 text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {t('desktopNav.adminAccount')}
              </span>
            )}
            {!isAdmin && isSeller && (
              <span className="inline-block mt-1 text-[10px] font-medium bg-sage-100 text-sage-700 px-2 py-0.5 rounded-full">
                {t('desktopNav.sellerAccount')}
              </span>
            )}
          </div>

          {menuItems.map((item) => (
            <button
              type="button"
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-warm-700 hover:bg-cream-100 hover:text-sage-700 transition-colors text-start"
            >
              <item.icon size={15} className="text-warm-400" />
              {item.label}
            </button>
          ))}

          <div className="border-t border-beige-100">
            <button
              type="button"
              onClick={() => {
                onLogout();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-red-50 transition-colors text-start"
            >
              <LogOut size={15} />
              {t('desktopNav.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DesktopNav({ unreadCount = 0, light = false }) {
  const { t } = useTranslation();
  const { user, isAuthenticated, isAdmin, isSeller, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="hidden md:flex items-center gap-1.5">
      {isAuthenticated ? (
        <>
          {!isAdmin && (
            <IconButton icon={Heart} to="/wishlist" label={t('desktopNav.wishlist')} light={light} />
          )}
          {!isAdmin && (
            <IconButton
              icon={isSeller ? ClipboardList : ShoppingBag}
              to={isSeller ? '/seller/orders' : '/orders'}
              label={t('desktopNav.myOrders')}
              light={light}
            />
          )}
          {!isAdmin && (
            <IconButton
              icon={Bell}
              to="/notifications"
              label={t('topbar.notifications')}
              badge={unreadCount}
              light={light}
            />
          )}

          <div className="ms-1">
            <ProfileDropdown
              user={user}
              isAdmin={isAdmin}
              isSeller={isSeller}
              onLogout={handleLogout}
            />
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className={`text-sm font-medium transition-colors px-3 py-2 rounded-full
              ${light
                ? 'text-white/80 hover:text-white hover:bg-white/15'
                : 'text-warm-600 hover:text-sage-600 hover:bg-cream-200'
              }`}
          >
            {t('topbar.login')}
          </Link>
          <Link
            to="/register"
            className={light ? 'btn btn-sm bg-white text-sage-700 hover:bg-white/90' : 'btn-primary btn-sm'}
          >
            {t('desktopNav.guestCta')}
          </Link>
        </div>
      )}
    </div>
  );
}
