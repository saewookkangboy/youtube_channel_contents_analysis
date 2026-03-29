import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LOCALE_STORAGE_KEY, type AppLocale } from './types';
import { translate, type TranslationKey } from './translations';

interface I18nContextValue {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
  toggleLocale: () => void;
  t: (key: TranslationKey, arg?: number | Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): AppLocale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === 'en' || raw === 'ko') return raw;
  } catch {
    /* ignore */
  }
  return 'ko';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    typeof window !== 'undefined' ? readStoredLocale() : 'ko',
  );

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'ko';
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'ko' ? 'en' : 'ko');
  }, [locale, setLocale]);

  const t = useCallback(
    (key: TranslationKey, arg?: number | Record<string, string | number>) => {
      return translate(locale, key, arg);
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
