import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Search, X, ChevronDown, AlignJustify } from 'lucide-react';
import { categoriesAPI } from '../../services/api';
import DesktopNav from './DesktopNav';
import LanguageSwitcher from '../ui/LanguageSwitcher';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  jewelry:         '💍',
  pottery:         '🏺',
  textiles:        '🧵',
  paintings:       '🎨',
  'leather-goods': '👜',
  'candles-soap':  '🕯️',
  'food-honey':    '🍯',
  'home-decor':    '🏡',
  embroidery:      '🪡',
  woodwork:        '🪵',
  other:           '✨',
};

// ─────────────────────────────────────────────────────────────
// LOGO MARK — exported so other components can reuse it
// ─────────────────────────────────────────────────────────────
export function LogoMark({ size = 'md' }) {
  const cfg = {
    sm: { arabic: 'text-2xl',  latin: 'text-[10px]' },
    md: { arabic: 'text-3xl',  latin: 'text-[11px]' },
    lg: { arabic: 'text-4xl',  latin: 'text-[12px]' },
  };
  const s = cfg[size] || cfg.md;

  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 group flex-shrink-0"
      aria-label="Hirftna — الرئيسية"
    >
      {/* Arabic calligraphy mark */}
      <div className="flex flex-col items-start leading-none gap-0.5">
        <span
          className={`${s.arabic} font-bold text-sage-600 group-hover:text-sage-700 transition-colors`}
          style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: 1.1 }}
        >
          حِرْفتنَا
        </span>
        <span
          className={`${s.latin} font-semibold tracking-[0.22em] text-warm-400 uppercase`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          MARKETPLACE
        </span>
      </div>
    </Link>
  );
}
<LanguageSwitcher variant="compact" />
// ─────────────────────────────────────────────────────────────
// CATEGORIES DROPDOWN — Etsy-style full panel
// ─────────────────────────────────────────────────────────────
function CategoriesDropdown({ categories }) {
  const [open, setOpen]  = useState(false);
  const navigate         = useNavigate();
  const location         = useLocation();
  const containerRef     = useRef(null);
  const buttonRef        = useRef(null);
  const [panelLeft, setPanelLeft] = useState(0);

  // Close on outside click or route change
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Calculate panel left offset so it aligns under the button
  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelLeft(rect.left);
    }
    setOpen((o) => !o);
  };

  const handleSelect = (cat) => {
    navigate(`/browse?category=${cat.id}`);
    setOpen(false);
  };

  const handleAll = () => {
    navigate('/browse');
    setOpen(false);
  };

  if (!categories.length) return null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
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
        <span>Categories</span>
        <ChevronDown
          size={14}
          strokeWidth={2.5}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── DROPDOWN PANEL ─────────────────────────────────── */}
      {open && (
        <>
          {/* Invisible backdrop to catch clicks outside */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div
            className="
              fixed z-50 mt-2
              bg-white rounded-2xl border border-beige-200
              shadow-[0_8px_40px_rgba(53,50,42,0.14),0_2px_8px_rgba(53,50,42,0.06)]
              overflow-hidden
              animate-slide-down
            "
            style={{
              top:      buttonRef.current
                ? buttonRef.current.getBoundingClientRect().bottom + 8
                : 64,
              left:     buttonRef.current
                ? buttonRef.current.getBoundingClientRect().left
                : panelLeft,
              minWidth: '240px',
              maxWidth: '280px',
            }}
            role="listbox"
          >
            {/* All categories */}
            <button
              type="button"
              onClick={handleAll}
              className="
                w-full flex items-center gap-3 px-5 py-3.5
                text-sm font-bold text-warm-800
                hover:bg-cream-100 hover:text-sage-700
                transition-colors border-b border-beige-100
                text-left
              "
            >
              <span className="text-lg flex-shrink-0">🛍️</span>
              <span>All Categories</span>
            </button>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className="
                    w-full flex items-center gap-3.5 px-5 py-3
                    text-sm font-medium text-warm-700
                    hover:bg-cream-100 hover:text-sage-700
                    transition-colors text-left
                    border-b border-beige-50 last:border-0
                  "
                  role="option"
                >
                  <span className="text-lg flex-shrink-0 w-6 text-center">
                    {CATEGORY_ICONS[cat.slug] ?? '✨'}
                  </span>
                  <span className="flex-1 truncate">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SEARCH BAR
// ─────────────────────────────────────────────────────────────
function SearchBar({ onSearch }) {
  const [expanded, setExpanded] = useState(false);
  const [query,    setQuery]    = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (expanded && inputRef.current) inputRef.current.focus();
  }, [expanded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setExpanded(false);
      setQuery('');
    }
  };

  const handleClose = () => {
    setExpanded(false);
    setQuery('');
  };

  return (
    <>
      {/* ── Mobile: icon only ──────────────────────────── */}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-cream-200 hover:bg-beige-200 transition-colors"
          aria-label="Search"
        >
          <Search size={17} className="text-sage-600" />
        </button>
      )}

      {/* ── Mobile: expanded overlay ────────────────────── */}
      {expanded && (
        <div className="md:hidden absolute inset-0 bg-white/98 backdrop-blur-sm flex items-center px-4 gap-2 z-20">
          <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2">
            <Search size={16} className="text-sage-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search handmade goods..."
              className="flex-1 bg-transparent text-sm text-warm-800 placeholder-warm-400 outline-none"
            />
          </form>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream-200 transition-colors flex-shrink-0"
            aria-label="Close search"
          >
            <X size={16} className="text-warm-500" />
          </button>
        </div>
      )}

      {/* ── Desktop: always visible bar ────────────────── */}
      <form
        onSubmit={handleSubmit}
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search handmade goods..."
          className="flex-1 bg-transparent text-sm text-warm-800 placeholder-warm-400 outline-none min-w-0"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear">
            <X size={13} className="text-warm-400 hover:text-warm-700" />
          </button>
        )}
      </form>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// TOP BAR — main component
// ─────────────────────────────────────────────────────────────
export default function TopBar({ unreadCount = 0 }) {
  const navigate    = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    categoriesAPI.getAll()
      .then((res) => {
        // Backend returns: { success: true, data: { categories: [...] } }
        // or sometimes: { success: true, data: [...] }
        const payload = res.data?.data;
        if (Array.isArray(payload)) {
          setCategories(payload);
        } else if (Array.isArray(payload?.categories)) {
          setCategories(payload.categories);
        } else {
          setCategories([]);
        }
      })
      .catch(() => setCategories([]));
  }, []);

  const handleSearch = useCallback((query) => {
    navigate(`/browse?search=${encodeURIComponent(query)}`);
  }, [navigate]);

  return (
    <header className="sticky top-0 z-40 bg-cream-100/95 backdrop-blur-md border-b border-beige-200">
      <div className="relative flex items-center justify-between h-16 px-4 md:px-6 lg:px-10">

        {/* ── LEFT: Logo ──────────────────────────────────── */}
        <LogoMark size="md" />

        {/* ── CENTER (desktop): Categories + Search ───────── */}
        <div className="hidden md:flex flex-1 items-center gap-4 px-6 max-w-2xl">
          <CategoriesDropdown categories={categories} />
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* ── RIGHT (mobile): categories + search icon ────── */}
        <div className="md:hidden flex items-center gap-2 ml-auto">
          {/* Mobile categories button — compact */}
          {categories.length > 0 && (
            <MobileCategoriesSheet categories={categories} />
          )}
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* ── RIGHT (desktop): icon nav ────────────────────── */}
        <DesktopNav unreadCount={unreadCount} />

      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE CATEGORIES SHEET — bottom drawer for mobile
// ─────────────────────────────────────────────────────────────
function MobileCategoriesSheet({ categories }) {
  const [open, setOpen]  = useState(false);
  const navigate         = useNavigate();
  const location         = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const handleSelect = (cat) => {
    navigate(`/browse?category=${cat.id}`);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 h-10 rounded-full bg-cream-200 hover:bg-beige-200 transition-colors text-sm font-semibold text-sage-700"
        aria-label="Categories"
      >
        <AlignJustify size={15} />
        <span className="text-xs">Categories</span>
      </button>

      {/* Sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-warm-900/40 backdrop-blur-sm z-50"
            onClick={() => setOpen(false)}
          />
          {/* Panel slides up */}
          <div
            className="
              fixed bottom-0 left-0 right-0 z-50
              bg-white rounded-t-3xl
              shadow-[0_-8px_40px_rgba(53,50,42,0.14)]
              animate-slide-up
              overflow-hidden
            "
            style={{ maxHeight: '75vh' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-beige-300 rounded-full" />
            </div>

            {/* Title */}
            <div className="px-5 pb-3 border-b border-beige-100">
              <h3 className="text-base font-bold text-warm-900">Categories</h3>
            </div>

            {/* List */}
            <div className="overflow-y-auto pb-8" style={{ maxHeight: 'calc(75vh - 80px)' }}>
              {/* All */}
              <button
                type="button"
                onClick={() => { navigate('/browse'); setOpen(false); }}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-cream-100 transition-colors border-b border-beige-50"
              >
                <div className="w-10 h-10 rounded-2xl bg-cream-200 flex items-center justify-center text-xl flex-shrink-0">
                  🛍️
                </div>
                <span className="text-sm font-semibold text-warm-800">All Categories</span>
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-cream-100 transition-colors border-b border-beige-50 last:border-0"
                >
                  <div className="w-10 h-10 rounded-2xl bg-cream-200 flex items-center justify-center text-xl flex-shrink-0">
                    {CATEGORY_ICONS[cat.slug] ?? '✨'}
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold text-warm-800">{cat.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}