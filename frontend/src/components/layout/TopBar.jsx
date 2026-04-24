import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlignJustify,
  Bell,
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { categoriesAPI, extractApiItems } from '../../services/api';
import DesktopNav from './DesktopNav';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useTranslation } from '../../i18n/index.jsx';
import { useAuth } from '../../hooks/useAuth';

const CATEGORY_ICONS = {
  jewelry: 'J',
  pottery: 'P',
  textiles: 'T',
  paintings: 'A',
  'leather-goods': 'L',
  'candles-soap': 'C',
  'food-honey': 'F',
  'home-decor': 'H',
  embroidery: 'E',
  woodwork: 'W',
  other: '*',
};

function getCategoryLabel(category, lang) {
  if (lang === 'ar') {
    return category.name_ar || category.name;
  }

  return category.name_en || category.name;
}

export function LogoMark({ size = 'md' }) {
  const { t } = useTranslation();
  const sizes = {
    sm: { arabic: 'text-2xl', latin: 'text-[10px]' },
    md: { arabic: 'text-3xl', latin: 'text-[11px]' },
    lg: { arabic: 'text-4xl', latin: 'text-[12px]' },
  };
  const current = sizes[size] ?? sizes.md;

  return (
    <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0" aria-label={t('topbar.homeAria')}>
      <div className="flex flex-col items-start leading-none gap-0.5">
        <span
          className={`${current.arabic} font-bold text-sage-600 group-hover:text-sage-700 transition-colors`}
          style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: 1.1 }}
        >
          {t('common.appNameArabic')}
        </span>
        <span
          className={`${current.latin} font-semibold tracking-[0.22em] text-warm-400 uppercase`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {t('common.appNameLatin')}
        </span>
      </div>
    </Link>
  );
}

function SearchBar({ onSearch }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const submit = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    onSearch(trimmed);
    setQuery('');
    setExpanded(false);
  };

  return (
    <>
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-cream-200 hover:bg-beige-200 transition-colors"
          aria-label={t('topbar.search')}
        >
          <Search size={17} className="text-sage-600" />
        </button>
      )}

      {expanded && (
        <div className="md:hidden absolute inset-0 z-[70] bg-white/98 backdrop-blur-sm flex items-center px-4 gap-2 pointer-events-auto">
          <form onSubmit={submit} className="flex-1 flex items-center gap-2">
            <Search size={16} className="text-sage-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('topbar.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-warm-800 placeholder-warm-400 outline-none"
            />
          </form>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setQuery('');
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream-200 transition-colors flex-shrink-0"
            aria-label={t('topbar.closeSearch')}
          >
            <X size={16} className="text-warm-500" />
          </button>
        </div>
      )}

      <form
        onSubmit={submit}
        className="
          hidden md:flex items-center gap-2
          bg-cream-100 border border-beige-200 rounded-full
          px-4 py-2.5
          hover:border-sage-300 focus-within:border-sage-400 focus-within:bg-white
          transition-all duration-200
          w-64 lg:w-80
        "
      >
        <Search size={15} className="text-sage-500 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('topbar.searchPlaceholder')}
          className="flex-1 bg-transparent text-sm text-warm-800 placeholder-warm-400 outline-none min-w-0"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={t('topbar.clearSearch')}>
            <X size={13} className="text-warm-400 hover:text-warm-700" />
          </button>
        )}
      </form>
    </>
  );
}

function CategoriesDropdown({ categories, lang }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 64, left: 0 });

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!categories.length) {
    return null;
  }

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }

    setOpen((current) => !current);
  };

  const selectCategory = (categoryId) => {
    navigate(categoryId ? `/browse?category=${categoryId}` : '/browse');
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
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
          transition-all duration-200 select-none
          ${open
            ? 'bg-sage-500 text-white shadow-soft-sm'
            : 'text-warm-700 hover:bg-cream-200 hover:text-warm-900'}
        `}
      >
        <AlignJustify size={15} strokeWidth={2} />
        <span>{t('topbar.categories')}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="
              fixed z-50 mt-2 bg-white rounded-2xl border border-beige-200
              shadow-[0_8px_40px_rgba(53,50,42,0.14),0_2px_8px_rgba(53,50,42,0.06)]
              overflow-hidden animate-slide-down
            "
            style={{
              top: panelPosition.top,
              left: panelPosition.left,
              minWidth: '240px',
              maxWidth: '280px',
            }}
            role="listbox"
          >
            <button
              type="button"
              onClick={() => selectCategory('')}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-warm-800 hover:bg-cream-100 hover:text-sage-700 transition-colors border-b border-beige-100 text-left"
            >
              <span className="text-lg flex-shrink-0">#</span>
              <span>{t('topbar.allCategories')}</span>
            </button>

            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => selectCategory(category.id)}
                  className="w-full flex items-center gap-3.5 px-5 py-3 text-sm font-medium text-warm-700 hover:bg-cream-100 hover:text-sage-700 transition-colors text-left border-b border-beige-50 last:border-0"
                  role="option"
                >
                  <span className="text-sm font-bold flex-shrink-0 w-6 text-center">
                    {CATEGORY_ICONS[category.slug] ?? '*'}
                  </span>
                  <span className="flex-1 truncate">{getCategoryLabel(category, lang)}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MobileCategoriesSheet({ categories, lang, open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const selectCategory = (categoryId) => {
    navigate(categoryId ? `/browse?category=${categoryId}` : '/browse');
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-warm-900/40 backdrop-blur-sm z-[70]" onClick={onClose} />
      <div
        className="
          fixed bottom-0 left-0 right-0 z-[80]
          bg-white rounded-t-3xl shadow-[0_-8px_40px_rgba(53,50,42,0.14)]
          animate-slide-up overflow-hidden pointer-events-auto
        "
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
            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-cream-100 transition-colors border-b border-beige-50"
          >
            <div className="w-10 h-10 rounded-2xl bg-cream-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
              #
            </div>
            <span className="text-sm font-semibold text-warm-800">{t('topbar.allCategories')}</span>
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => selectCategory(category.id)}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-cream-100 transition-colors border-b border-beige-50 last:border-0"
            >
              <div className="w-10 h-10 rounded-2xl bg-cream-200 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {CATEGORY_ICONS[category.slug] ?? '*'}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-warm-800">
                  {getCategoryLabel(category, lang)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function MobileMenu({ open, onClose, categories, lang, unreadCount }) {
  const { t } = useTranslation();
  const { isAuthenticated, isSeller } = useAuth();
  const navigate = useNavigate();

  const accountLinks = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { label: t('topbar.login'), path: '/login', icon: User },
        { label: t('topbar.register'), path: '/register', icon: ShoppingBag },
      ];
    }

    return [
      { label: t('topbar.wishlist'), path: '/wishlist', icon: Heart },
      { label: t('topbar.orders'), path: isSeller ? '/seller/orders' : '/orders', icon: ShoppingBag },
      { label: t('topbar.profile'), path: isSeller ? '/seller/dashboard' : '/profile', icon: User },
      { label: t('topbar.notifications'), path: '/notifications', icon: Bell, badge: unreadCount },
    ];
  }, [isAuthenticated, isSeller, t, unreadCount]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-warm-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-16 inset-x-0 z-[70] px-4 pointer-events-none">
        <div className="max-h-[calc(100vh-88px)] overflow-y-auto bg-white rounded-3xl border border-beige-200 shadow-soft-lg p-4 space-y-4 pointer-events-auto">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-warm-400 font-semibold">
              {t('topbar.account')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {accountLinks.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-cream-100 px-4 py-3 text-sm font-semibold text-warm-800 text-left"
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
            <p className="text-[10px] uppercase tracking-[0.18em] text-warm-400 font-semibold">
              {t('topbar.shopByCategory')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    navigate(`/browse?category=${category.id}`);
                    onClose();
                  }}
                  className="flex items-center gap-3 rounded-2xl border border-beige-200 bg-white px-4 py-3 text-sm font-medium text-warm-800 text-left"
                >
                  <span className="w-7 h-7 rounded-xl bg-cream-200 flex items-center justify-center text-xs font-bold text-sage-700 flex-shrink-0">
                    {CATEGORY_ICONS[category.slug] ?? '*'}
                  </span>
                  <span className="truncate">{getCategoryLabel(category, lang)}</span>
                </button>
              ))}
            </div>
          </div>

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

  useEffect(() => {
    categoriesAPI.getAll()
      .then((response) => {
        setCategories(extractApiItems(response, { itemKeys: ['categories'] }));
      })
      .catch(() => setCategories([]));
  }, []);

  const handleSearch = useCallback((query) => {
    navigate(`/browse?search=${encodeURIComponent(query)}`);
  }, [navigate]);

  return (
    <header className="sticky top-0 z-40 bg-cream-100/95 backdrop-blur-md border-b border-beige-200">
      <div className="relative flex items-center justify-between h-16 px-4 md:px-6 lg:px-10 gap-3">
        <LogoMark size="md" />

        <div className="hidden md:flex flex-1 items-center gap-4 px-4 max-w-2xl">
          <CategoriesDropdown categories={categories} lang={lang} />
          <SearchBar onSearch={handleSearch} />
        </div>

        <div className="md:hidden flex items-center gap-2 ml-auto z-[65] pointer-events-auto">
          {categories.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileCategoriesOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 h-10 rounded-full bg-cream-200 hover:bg-beige-200 transition-colors text-sm font-semibold text-sage-700"
              aria-label={t('topbar.categories')}
            >
              <AlignJustify size={15} />
              <span className="text-xs">{t('topbar.categories')}</span>
            </button>
          )}

          <SearchBar onSearch={handleSearch} />

          <button
            type="button"
            onClick={() => {
              setMobileCategoriesOpen(false);
              setMobileMenuOpen((current) => !current);
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-cream-200 hover:bg-beige-200 transition-colors"
            aria-label={mobileMenuOpen ? t('topbar.closeMenu') : t('topbar.menu')}
          >
            {mobileMenuOpen ? <X size={18} className="text-sage-700" /> : <Menu size={18} className="text-sage-700" />}
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher variant="compact" />
          <DesktopNav unreadCount={unreadCount} />
        </div>
      </div>

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
    </header>
  );
}
