import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlignJustify,
  Bell,
  ChevronDown,
  ChevronRight,
  Heart,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  ShoppingBag,
  User,
  Users,
  X,
  Shapes,
} from 'lucide-react';
import { categoriesAPI, extractApiItems } from '../../services/api';
import DesktopNav from './DesktopNav';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useTranslation } from '../../i18n/index.jsx';
import { useAuth } from '../../hooks/useAuth';
import { getCategoryIcon } from '../../utils/categoryIcons';
import { LogoMark } from '../ui/LogoMark';

function getCategoryLabel(category, t) {
  return t(`categories.${category.name}`, category.name);
}

function SearchBar({ onSearch, light = false }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus();
  }, [expanded]);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    onSearch(trimmed);
    setQuery('');
    setExpanded(false);
  };

  return (
    <>
      {/* Mobile collapsed search icon */}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className={`md:hidden flex items-center justify-center w-10 h-10 rounded-full transition-colors
            ${light ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-cream-200 hover:bg-beige-200 text-sage-600'}`}
          aria-label={t('topbar.search')}
        >
          <Search size={17} />
        </button>
      )}

      {/* Mobile expanded search overlay */}
      {expanded && (
        <div className="md:hidden absolute inset-0 z-[70] bg-white/98 backdrop-blur-sm flex items-center px-4 gap-2">
          <form onSubmit={submit} className="flex-1 flex items-center gap-2">
            <Search size={16} className="text-sage-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('topbar.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-warm-800 placeholder-warm-400 outline-none"
            />
          </form>
          <button
            type="button"
            onClick={() => { setExpanded(false); setQuery(''); }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream-200 transition-colors"
            aria-label={t('topbar.closeSearch')}
          >
            <X size={16} className="text-warm-500" />
          </button>
        </div>
      )}

      {/* Desktop search bar */}
      <form
        onSubmit={submit}
        className={`hidden md:flex items-center gap-2 rounded-full px-4 py-2.5
          hover:border-sage-300 focus-within:border-sage-400 focus-within:bg-white
          transition-all duration-200 w-64 lg:w-80 border
          ${light
            ? 'bg-white/15 border-white/20 hover:bg-white/25 focus-within:bg-white focus-within:text-warm-800'
            : 'bg-cream-100 border-beige-200'
          }`}
      >
        <Search size={15} className={light ? 'text-white/70' : 'text-sage-500'} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('topbar.searchPlaceholder')}
          className={`flex-1 bg-transparent text-sm placeholder-opacity-60 outline-none min-w-0
            ${light ? 'text-white placeholder-white/60' : 'text-warm-800 placeholder-warm-400'}`}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={t('topbar.clearSearch')}>
            <X size={13} className={light ? 'text-white/70 hover:text-white' : 'text-warm-400 hover:text-warm-700'} />
          </button>
        )}
      </form>
    </>
  );
}

function CategoriesDropdown({ categories, light = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 64, left: 0 });

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!categories.length) return null;

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPosition({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen((c) => !c);
  };

  const selectCategory = (id) => {
    navigate(id ? `/browse?category=${id}` : '/browse');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
          transition-all duration-200 select-none
          ${open
            ? 'bg-sage-500 text-white shadow-soft-sm'
            : light
              ? 'text-white hover:bg-white/15'
              : 'text-warm-700 hover:bg-cream-200 hover:text-warm-900'
          }`}
      >
        <AlignJustify size={15} strokeWidth={2} />
        <span>{t('topbar.categories')}</span>
        <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 mt-2 bg-white rounded-2xl border border-beige-200
              shadow-[0_8px_40px_rgba(53,50,42,0.14),0_2px_8px_rgba(53,50,42,0.06)]
              overflow-hidden animate-slide-down"
            style={{ top: panelPosition.top, left: panelPosition.left, minWidth: '240px', maxWidth: '280px' }}
            role="listbox"
          >
            <button
              type="button"
              onClick={() => selectCategory('')}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-warm-800
                hover:bg-cream-100 hover:text-sage-700 transition-colors border-b border-beige-100 text-start"
            >
              <Shapes size={16} className="text-sage-500 flex-shrink-0" />
              <span>{t('topbar.allCategories')}</span>
            </button>

            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => selectCategory(cat.id)}
                    className="w-full flex items-center gap-3.5 px-5 py-3 text-sm font-medium text-warm-700
                      hover:bg-cream-100 hover:text-sage-700 transition-colors text-start border-b border-beige-50 last:border-0"
                    role="option"
                  >
                    <Icon size={15} className="text-sage-500 flex-shrink-0" />
                    <span className="flex-1 truncate">{getCategoryLabel(cat, t)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MobileCategoriesSheet({ categories, open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const selectCategory = (id) => {
    navigate(id ? `/browse?category=${id}` : '/browse');
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-warm-900/40 backdrop-blur-sm z-[70]" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-3xl
          shadow-[0_-8px_40px_rgba(53,50,42,0.14)] animate-slide-up overflow-hidden"
        style={{ maxHeight: '75vh' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-beige-300 rounded-full" />
        </div>
        <div className="px-5 pb-3 border-b border-beige-100">
          <h3 className="text-base font-bold text-warm-900">{t('topbar.categories')}</h3>
        </div>
        <div className="overflow-y-auto pb-8" style={{ maxHeight: 'calc(75vh - 80px)' }}>
          <button
            type="button"
            onClick={() => selectCategory('')}
            className="w-full flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-cream-100 transition-colors border-b border-beige-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-cream-200 flex items-center justify-center flex-shrink-0">
                <Shapes size={18} className="text-sage-600" />
              </div>
              <span className="text-sm font-semibold text-warm-800">{t('topbar.allCategories')}</span>
            </div>
            <ChevronRight size={16} className="text-warm-400 flex-shrink-0 rtl:rotate-180" />
          </button>
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.slug);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-cream-100 transition-colors border-b border-beige-50 last:border-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-sage-600" />
                  </div>
                  <p className="text-sm font-semibold text-warm-800 text-start truncate">{getCategoryLabel(cat, t)}</p>
                </div>
                <ChevronRight size={16} className="text-warm-400 flex-shrink-0 rtl:rotate-180" />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function MobileMenu({ open, onClose, categories, unreadCount }) {
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin, isSeller, logout } = useAuth();
  const navigate = useNavigate();

  const accountLinks = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { label: t('topbar.login'),    path: '/login',    icon: User },
        { label: t('topbar.register'), path: '/register', icon: ShoppingBag },
      ];
    }
    if (isAdmin) {
      return [
        { label: t('admin.dashboard'), path: '/admin',          icon: LayoutDashboard },
        { label: t('admin.users'),     path: '/admin/users',    icon: Users },
        { label: t('admin.products'),  path: '/admin/products', icon: Package },
        { label: t('topbar.profile'),  path: '/profile',        icon: User },
      ];
    }
    return [
      { label: t('topbar.wishlist'),       path: '/wishlist',                          icon: Heart },
      { label: t('topbar.orders'),         path: isSeller ? '/seller/orders' : '/orders', icon: ShoppingBag },
      { label: t('topbar.profile'),        path: isSeller ? '/seller/dashboard' : '/profile', icon: User },
      { label: t('topbar.notifications'),  path: '/notifications', icon: Bell, badge: unreadCount },
    ];
  }, [isAuthenticated, isAdmin, isSeller, t, unreadCount]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-warm-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-16 inset-x-0 z-[70] px-4">
        <div className="max-h-[calc(100vh-88px)] overflow-y-auto bg-white rounded-3xl border border-beige-200 shadow-soft-lg p-4 space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-warm-400 font-semibold">{t('topbar.account')}</p>
            <div className="grid grid-cols-2 gap-2">
              {accountLinks.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => { navigate(item.path); onClose(); }}
                  className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-cream-100 px-4 py-3 text-sm font-semibold text-warm-800 text-start"
                >
                  <item.icon size={16} className="text-sage-600 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-danger rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-warm-400 font-semibold">{t('topbar.shopByCategory')}</p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.slug);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => { navigate(`/browse?category=${cat.id}`); onClose(); }}
                    className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-white px-4 py-3 text-sm font-medium text-warm-800 text-start"
                  >
                    <div className="w-7 h-7 rounded-xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-sage-600" />
                    </div>
                    <span className="truncate">{getCategoryLabel(cat, t)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isAuthenticated && (
            <button
              type="button"
              onClick={async () => { onClose(); await logout(); navigate('/'); }}
              className="w-full flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-danger text-start hover:bg-red-100 transition-colors"
            >
              <LogOut size={16} className="flex-shrink-0" />
              <span>{t('auth.logout')}</span>
            </button>
          )}

          <LanguageSwitcher variant="full" />
        </div>
      </div>
    </>
  );
}

export default function TopBar({ unreadCount = 0 }) {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);

  const isSolid = true;

  useEffect(() => {
    categoriesAPI.getAll()
      .then((res) => setCategories(extractApiItems(res, { itemKeys: ['categories'] })))
      .catch(() => setCategories([]));
  }, []);

  const handleSearch = useCallback((q) => navigate(`/browse?search=${encodeURIComponent(q)}`), [navigate]);

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300
          ${isSolid
            ? 'bg-cream-100/95 backdrop-blur-md border-b border-beige-200 shadow-[0_1px_0_rgba(53,50,42,0.06)]'
            : 'bg-transparent border-b border-transparent'
          }`}
      >
        <div className="relative flex items-center justify-between h-16 px-4 md:px-6 lg:px-10 gap-3">
          <LogoMark size="md" light={!isSolid} />

          <div className="hidden md:flex flex-1 items-center gap-3 px-4 max-w-2xl">
            <CategoriesDropdown categories={categories} lang={lang} light={!isSolid} />
            <SearchBar onSearch={handleSearch} light={!isSolid} />
          </div>

          <div className="md:hidden flex items-center gap-2 ml-auto z-[65]">
            {categories.length > 0 && (
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); setMobileCategoriesOpen(true); }}
                className={`flex items-center gap-1.5 px-3 h-10 rounded-full transition-colors text-sm font-semibold
                  ${!isSolid ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-cream-200 hover:bg-beige-200 text-sage-700'}`}
                aria-label={t('topbar.categories')}
              >
                <AlignJustify size={15} />
                <span className="text-xs">{t('topbar.categories')}</span>
              </button>
            )}

            <SearchBar onSearch={handleSearch} light={!isSolid} />

            <button
              type="button"
              onClick={() => { setMobileCategoriesOpen(false); setMobileMenuOpen((c) => !c); }}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors
                ${!isSolid ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-cream-200 hover:bg-beige-200 text-sage-700'}`}
              aria-label={mobileMenuOpen ? t('topbar.closeMenu') : t('topbar.menu')}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <DesktopNav unreadCount={unreadCount} light={!isSolid} />
          </div>
        </div>
      </header>

      {/* Portaled outside <header> so backdrop-blur-md does not break fixed positioning */}
      <MobileCategoriesSheet
        categories={categories}
        lang={lang}
        open={mobileCategoriesOpen}
        onClose={() => setMobileCategoriesOpen(false)}
      />
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        categories={categories}
        lang={lang}
        unreadCount={unreadCount}
      />
    </>
  );
}
