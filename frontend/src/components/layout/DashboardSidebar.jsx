import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Settings, ShoppingBag, Tag, TrendingUp, Users } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/index.jsx';

const SELLER_LINKS = [
  { to: '/seller/dashboard',  icon: LayoutDashboard, labelKey: 'sellerDashboard.nav.overview' },
  { to: '/seller/orders',     icon: ShoppingBag,     labelKey: 'sellerDashboard.nav.orders' },
  { to: '/seller/products',   icon: Package,         labelKey: 'sellerDashboard.nav.products' },
  { to: '/seller/promotions', icon: TrendingUp,      labelKey: 'sellerDashboard.nav.promotions' },
  { to: '/seller/profile',    icon: Settings,        labelKey: 'sellerDashboard.nav.settings' },
];

const ADMIN_LINKS = [
  { to: '/admin',              icon: LayoutDashboard, labelKey: 'admin.dashboard' },
  { to: '/admin/users',        icon: Users,           labelKey: 'admin.users' },
  { to: '/admin/products',     icon: Package,         labelKey: 'admin.products' },
  { to: '/admin/promotions',   icon: TrendingUp,      labelKey: 'adminPromotions.title' },
  { to: '/admin/categories',   icon: Tag,             labelKey: 'admin.categories.title' },
];

export default function DashboardSidebar({ role = 'seller' }) {
  const { t } = useTranslation();
  const location = useLocation();
  const links = role === 'admin' ? ADMIN_LINKS : SELLER_LINKS;

  return (
    <aside className="hidden md:flex flex-col w-52 flex-shrink-0 border-r border-beige-200 bg-white sticky top-14 self-start h-[calc(100dvh-3.5rem)] overflow-y-auto">
      <div className="px-3 pt-5 pb-2">
        <p className="text-[9px] font-bold tracking-[0.18em] text-warm-400 uppercase px-3 mb-2">
          {role === 'admin' ? t('admin.adminPanel') : t('sellerDashboard.nav.overview')}
        </p>
      </div>
      <nav className="flex flex-col gap-0.5 px-3 pb-6">
        {links.map(({ to, icon: Icon, labelKey }) => {
          const isExact = to === '/admin' || to === '/seller/dashboard';
          const isActive = isExact
            ? location.pathname === to
            : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sage-50 text-sage-700 border border-sage-100'
                  : 'text-warm-600 hover:bg-cream-200 hover:text-warm-900'
              )}
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2.2 : 1.8}
                className={isActive ? 'text-sage-600' : 'text-warm-400'}
              />
              <span className="truncate">{t(labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
