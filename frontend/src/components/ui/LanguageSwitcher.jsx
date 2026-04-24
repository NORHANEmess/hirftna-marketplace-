import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/index.jsx';

const LANGUAGE_CODES = ['ar', 'en'];

export default function LanguageSwitcher({ variant = 'compact', className = '' }) {
  const { lang, setLang, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const languages = [
    { code: 'en', label: t('language.english'), flag: 'EN', dir: 'ltr' },
    { code: 'ar', label: t('language.arabic'), flag: 'AR', dir: 'rtl' },
  ];

  const currentLanguage = languages.find((item) => item.code === lang) ?? languages[0];

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

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t('language.switcher')}
        className={clsx(
          'flex items-center gap-1.5 rounded-full transition-all duration-200 font-medium select-none',
          variant === 'compact'
            ? 'px-2.5 py-1.5 text-sm text-warm-600 hover:bg-cream-200 hover:text-warm-900'
            : 'w-full justify-between px-4 py-3 text-sm bg-white border border-beige-200 hover:border-sage-300 text-warm-700 shadow-soft-sm'
        )}
      >
        {variant === 'compact' ? (
          <>
            <Globe size={15} className="text-sage-500" />
            <span className="text-xs font-semibold">{currentLanguage.flag}</span>
            <ChevronDown
              size={12}
              strokeWidth={2.5}
              className={clsx('transition-transform duration-200', open && 'rotate-180')}
            />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-sage-500" />
              <div className="text-left">
                <p className="text-[10px] uppercase tracking-[0.18em] text-warm-400">
                  {t('language.switcher')}
                </p>
                <p className="font-semibold">{currentLanguage.label}</p>
              </div>
            </div>
            <ChevronDown
              size={14}
              strokeWidth={2.5}
              className={clsx('transition-transform duration-200', open && 'rotate-180')}
            />
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="
              absolute z-50 mt-2 bg-white rounded-2xl border border-beige-200
              shadow-[0_8px_32px_rgba(53,50,42,0.12),0_2px_8px_rgba(53,50,42,0.06)]
              overflow-hidden animate-slide-down
            "
            style={{ right: 0, minWidth: variant === 'compact' ? '140px' : '100%' }}
            role="listbox"
          >
            {languages
              .filter((item) => LANGUAGE_CODES.includes(item.code))
              .map((item) => {
                const active = item.code === lang;

                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setLang(item.code);
                      setOpen(false);
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left',
                      active
                        ? 'bg-sage-50 text-sage-700 font-semibold'
                        : 'text-warm-700 hover:bg-cream-100 font-medium'
                    )}
                    dir={item.dir}
                  >
                    <span className="text-xs font-bold w-6 flex-shrink-0">{item.flag}</span>
                    <span className="flex-1">{item.label}</span>
                    {active && <span className="w-1.5 h-1.5 bg-sage-500 rounded-full flex-shrink-0" />}
                  </button>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
