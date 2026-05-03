/**
 * i18n/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight internationalisation system for Hirftna.
 *
 * Architecture overview:
 *   - LanguageContext holds the current locale + the t() translation function
 *   - LanguageProvider wraps the app and manages localStorage persistence
 *   - useTranslation() is the hook every component uses to access translations
 *   - t(key) resolves dot-notation keys like "nav.home" → "الرئيسية"
 *
 * Supported languages:
 *   ar  → Arabic (RTL, default)
 *   en  → English (LTR)
 *   fr  → French (LTR)
 *
 * Usage in any component:
 *   import { useTranslation } from '../i18n';
 *   const { t, lang, setLang } = useTranslation();
 *   <h1>{t('home.hero.title')}</h1>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ── Import locale JSON files ──────────────────────────────────────────────────
import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

// ── Locale map — add new languages here later ─────────────────────────────────
const LOCALES = { ar, en, fr };

// ── RTL languages — used to set document.dir automatically ───────────────────
const RTL_LANGS = new Set(['ar']);

// ── Storage key for persisting the user's language preference ─────────────────
const STORAGE_KEY = 'hirftna_lang';

// ── Default language ──────────────────────────────────────────────────────────
const DEFAULT_LANG = 'ar';

// ─────────────────────────────────────────────────────────────────────────────
// CORE: t() — the translation function
//
// Takes a dot-notation key and resolves it against the locale object.
// Example: t('nav.home') on the Arabic locale returns "الرئيسية"
//
// Fallback chain:
//   1. Try the requested locale
//   2. Fall back to Arabic (the source of truth)
//   3. Return the raw key if nothing is found (makes missing translations visible)
// ─────────────────────────────────────────────────────────────────────────────
function resolve(obj, key) {
  // Walk dot-separated path: "nav.home" → obj["nav"]["home"]
  return key.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) return acc[part];
    return undefined;
  }, obj);
}

function createTranslator(lang) {
  return function t(key, params = {}) {
    // 1. Try the current locale
    let value = resolve(LOCALES[lang], key);

    // 2. Fall back to Arabic if not found
    if (value === undefined) value = resolve(LOCALES[ar], key);

    // 3. Last resort: return the key itself so the missing string is visible
    if (value === undefined) return key;

    // 4. Interpolate params: t('greeting', { name: 'أمينة' }) with "مرحباً {{name}}"
    //    → "مرحباً أمينة"
    return String(value).replace(/\{\{(\w+)\}\}/g, (_, k) =>
      params[k] !== undefined ? params[k] : `{{${k}}}`
    );
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
const LanguageContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER
// Wrap your App with this in main.jsx:
//   <LanguageProvider><App /></LanguageProvider>
// ─────────────────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }) {
  // Hydrate from localStorage, fall back to Arabic
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && LOCALES[stored] ? stored : DEFAULT_LANG;
  });

  // t() is memoised — recreated only when lang changes
  const t = useCallback(createTranslator(lang), [lang]);

  // Apply RTL/LTR direction and lang attribute to the document root
  // whenever the language changes — this makes the entire DOM respond correctly
  useEffect(() => {
    const isRTL = RTL_LANGS.has(lang);
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Public setter — persists to localStorage and updates state
  function setLang(newLang) {
    if (!LOCALES[newLang]) {
      console.warn(`[i18n] Unknown language: "${newLang}". Available: ${Object.keys(LOCALES).join(', ')}`);
      return;
    }
    localStorage.setItem(STORAGE_KEY, newLang);
    setLangState(newLang);
  }

  const isRTL = RTL_LANGS.has(lang);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK — use this in every component that needs translations
//
// const { t, lang, setLang, isRTL } = useTranslation();
// ─────────────────────────────────────────────────────────────────────────────
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used inside <LanguageProvider>');
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE SWITCHER COMPONENT
// Drop this anywhere in your UI — TopBar, ProfilePage, etc.
//
// Usage: <LanguageSwitcher />
// ─────────────────────────────────────────────────────────────────────────────
export function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useTranslation();

  const LANGUAGES = [
    { code: 'ar', label: 'العربية', flag: '🇩🇿' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
  ];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          title={l.label}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
            transition-all duration-150
            ${lang === l.code
              ? 'bg-sage-500 text-white shadow-sm'
              : 'text-warm-500 hover:bg-cream-200 hover:text-warm-800'
            }`}
        >
          <span>{l.flag}</span>
          <span className="hidden sm:inline">{l.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE EXPORTS
// So consumers can import everything from one place:
//   import { useTranslation, LanguageProvider, LanguageSwitcher } from '../i18n';
// ─────────────────────────────────────────────────────────────────────────────
export default { useTranslation, LanguageProvider, LanguageSwitcher };