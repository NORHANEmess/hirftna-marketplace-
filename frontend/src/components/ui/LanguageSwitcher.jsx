import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────
// LANGUAGES
// ─────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧', dir: 'ltr' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'ar', label: 'العربية',  flag: '🇩🇿', dir: 'rtl' },
];

// ─────────────────────────────────────────────────────────────
// LANGUAGE SWITCHER
// Variants:
//   'compact'  — icon + flag only  (for TopBar/DesktopNav)
//   'full'     — flag + label dropdown (for Profile, Settings)
// ─────────────────────────────────────────────────────────────
export default function LanguageSwitcher({ variant = 'compact', className = '' }) {
  const { i18n }    = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef    = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (lang) => {
    i18n.changeLanguage(lang.code);
    // RTL applied automatically by i18n/index.js listener
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      {/* ── Trigger ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={clsx(
          'flex items-center gap-1.5 rounded-full transition-all duration-200 font-medium select-none',
          variant === 'compact'
            ? 'px-2.5 py-1.5 text-sm text-warm-600 hover:bg-cream-200 hover:text-warm-900'
            : 'px-4 py-2.5 text-sm bg-white border border-beige-200 hover:border-sage-300 text-warm-700 shadow-soft-sm'
        )}
      >
        {variant === 'compact' ? (
          <>
            <Globe size={15} className="text-sage-500" />
            <span className="text-base leading-none">{currentLang.flag}</span>
            <ChevronDown
              size={12}
              strokeWidth={2.5}
              className={clsx('transition-transform duration-200', open && 'rotate-180')}
            />
          </>
        ) : (
          <>
            <span className="text-base">{currentLang.flag}</span>
            <span>{currentLang.label}</span>
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              className={clsx('ml-auto transition-transform duration-200', open && 'rotate-180')}
            />
          </>
        )}
      </button>

      {/* ── Dropdown panel ───────────────────────────────── */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="
              absolute z-50 mt-2 bg-white rounded-2xl border border-beige-200
              shadow-[0_8px_32px_rgba(53,50,42,0.12),0_2px_8px_rgba(53,50,42,0.06)]
              overflow-hidden animate-slide-down
            "
            style={{ right: 0, minWidth: '160px' }}
            role="listbox"
          >
            {LANGUAGES.map((lang) => {
              const active = lang.code === i18n.language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(lang)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left',
                    active
                      ? 'bg-sage-50 text-sage-700 font-semibold'
                      : 'text-warm-700 hover:bg-cream-100 font-medium'
                  )}
                  dir={lang.dir}
                >
                  <span className="text-lg flex-shrink-0">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 bg-sage-500 rounded-full flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}