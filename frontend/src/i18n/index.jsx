/* eslint-disable react-refresh/only-export-components */
import { useEffect } from 'react';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider, useTranslation as useI18NextTranslation } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';

const STORAGE_KEY = 'hirftna_lang';
const DEFAULT_LANG = 'ar';
const RTL_LANGS = new Set(['ar']);
const SUPPORTED_LANGUAGES = ['ar', 'en'];

function resolveInitialLanguage() {
  const storedLanguage = localStorage.getItem(STORAGE_KEY);
  if (storedLanguage && SUPPORTED_LANGUAGES.includes(storedLanguage)) {
    return storedLanguage;
  }

  return DEFAULT_LANG;
}

export function getDirection(language) {
  return RTL_LANGS.has(language) ? 'rtl' : 'ltr';
}

export function getCurrentLanguage() {
  return i18n.resolvedLanguage || i18n.language || DEFAULT_LANG;
}

function syncDocumentLanguage(language) {
  document.documentElement.lang = language;
  document.documentElement.dir = getDirection(language);
  localStorage.setItem(STORAGE_KEY, language);
}

if (!i18n.isInitialized) {
  const initialLanguage = resolveInitialLanguage();

  i18n
    .use(initReactI18next)
    .init({
      lng: initialLanguage,
      fallbackLng: DEFAULT_LANG,
      supportedLngs: SUPPORTED_LANGUAGES,
      interpolation: {
        escapeValue: false,
      },
      resources: {
        ar: { translation: ar },
        en: { translation: en },
      },
    });

  syncDocumentLanguage(initialLanguage);
}

export function LanguageProvider({ children }) {
  useEffect(() => {
    syncDocumentLanguage(getCurrentLanguage());

    const handleLanguageChange = (language) => {
      syncDocumentLanguage(language);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
}

export function useTranslation() {
  const translation = useI18NextTranslation();
  const language = getCurrentLanguage();

  return {
    ...translation,
    lang: language,
    setLang: (nextLanguage) => {
      if (SUPPORTED_LANGUAGES.includes(nextLanguage)) {
        i18n.changeLanguage(nextLanguage);
      }
    },
    isRTL: getDirection(language) === 'rtl',
  };
}

export { i18n };

export default {
  LanguageProvider,
  useTranslation,
};
