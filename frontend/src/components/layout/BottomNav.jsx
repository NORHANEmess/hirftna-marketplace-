import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  Heart,
  Home,
  LayoutDashboard,
  Package,
  Search,
  ShoppingBag,
  Tag,
  User,
  Users,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../i18n/index.jsx';

function NavItem({ item, isActive, onClick, unreadCount }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer group"
      aria-label={item.label}
    >
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
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-brick-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white leading-none border border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>

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

export default function BottomNav({ unreadCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, isSeller } = useAuth();
  const { t } = useTranslation();

  const visitorNav = [
    { icon: Home, label: t('bottomNav.home'), path: '/', auth: false },
    { icon: Search, label: t('bottomNav.browse'), path: '/browse', auth: false },
    { icon: Heart, label: t('bottomNav.wishlist'), path: '/wishlist', auth: true },
    { icon: User, label: t('bottomNav.login'), path: '/login', auth: false },
  ];

  const clientNav = [
    { icon: Home, label: t('bottomNav.home'), path: '/', auth: false },
    { icon: Search, label: t('bottomNav.browse'), path: '/browse', auth: false },
    { icon: Heart, label: t('bottomNav.wishlist'), path: '/wishlist', auth: true },
    { icon: ShoppingBag, label: t('bottomNav.orders'), path: '/orders', auth: true },
    { icon: User, label: t('bottomNav.profile'), path: '/profile', auth: true },
  ];

  const sellerNav = [
    { icon: Home, label: t('bottomNav.home'), path: '/', auth: false },
    { icon: Search, label: t('bottomNav.browse'), path: '/browse', auth: false },
    { icon: ClipboardList, label: t('bottomNav.orders'), path: '/seller/orders', auth: true },
    { icon: Bell, label: t('bottomNav.notifications'), path: '/notifications', auth: true },
    { icon: User, label: t('bottomNav.profile'), path: '/seller/dashboard', auth: true },
  ];

  const adminNav = [
    { icon: LayoutDashboard, label: t('bottomNav.dashboard'), path: '/admin', auth: true },
    { icon: Users, label: t('bottomNav.users'), path: '/admin/users', auth: true },
    { icon: Package, label: t('bottomNav.products'), path: '/admin/products', auth: true },
    { icon: Tag, label: t('bottomNav.categories'), path: '/admin/categories', auth: true },
    { icon: User, label: t('bottomNav.profile'), path: '/profile', auth: true },
  ];

  const navItems = isAdmin
    ? adminNav
    : isSeller
      ? sellerNav
      : isAuthenticated
        ? clientNav
        : visitorNav;

  const handleNavigation = (item) => {
    if (item.auth && !isAuthenticated) {
      navigate('/login');
      return;
    }

    navigate(item.path);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }

    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom">
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
              onClick={() => handleNavigation(item)}
              unreadCount={item.path === '/notifications' ? unreadCount : 0}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
