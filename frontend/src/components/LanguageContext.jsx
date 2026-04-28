/**
 * LanguageContext — Global i18n Provider
 *
 * Provides:
 *  - `lang`          : current language code ('en' | 'hi')
 *  - `setLang(code)` : switch language, persists to localStorage
 *  - `t(key, vars?)` : translate a dot-notation key, with optional {{var}} interpolation
 *
 * Usage:
 *   const { t, lang, setLang } = useLang();
 *   t('auth.signIn')                     → "Sign In" | "साइन इन करें"
 *   t('dashboard.ofTotal', { total: 5 }) → "of 5 total" | "कुल 5 में से"
 */

import { createContext, useContext, useState, useCallback } from 'react';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

const TRANSLATIONS = { en, hi };
const STORAGE_KEY  = 'js_lang';
const DEFAULT_LANG = 'en';

const LanguageContext = createContext(null);

/**
 * Resolve a dot-notation key against the translation object.
 * Falls back to the English value, then the raw key if nothing found.
 */
function resolve(translations, key) {
  const parts  = key.split('.');
  let   cursor = translations;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== 'object') return null;
    cursor = cursor[part];
  }
  return typeof cursor === 'string' ? cursor : null;
}

/**
 * Interpolate {{variable}} placeholders in a translated string.
 * Example: interpolate("of {{total}} total", { total: 5 }) → "of 5 total"
 */
function interpolate(str, vars = {}) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`,
  );
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG,
  );

  const setLang = useCallback((code) => {
    if (!TRANSLATIONS[code]) return;
    localStorage.setItem(STORAGE_KEY, code);
    setLangState(code);
    // Update <html lang="..."> for accessibility + font rendering
    document.documentElement.lang = code;
  }, []);

  /**
   * Translate a key. Returns English fallback, then the key itself if not found.
   * @param {string}  key   - dot-notation key, e.g. 'auth.signIn'
   * @param {object}  [vars] - interpolation variables, e.g. { name: 'Priya' }
   */
  const t = useCallback(
    (key, vars) => {
      const current  = resolve(TRANSLATIONS[lang], key);
      const fallback = resolve(TRANSLATIONS[DEFAULT_LANG], key);
      const str      = current ?? fallback ?? key;
      return interpolate(str, vars);
    },
    [lang],
  );

  // Set html lang on initial render
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
