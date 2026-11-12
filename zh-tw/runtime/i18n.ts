import dictionary from './zhtw-locale.json';

export type Locale = 'zh-TW' | 'en';

const STORAGE_KEY = 'angkorgit-zh-tw-locale';
const translations = dictionary as Record<string, string>;

// Upstream's tests assert English copy: unit tests run in Node, e2e in an automated browser.
// `import.meta` is avoided because Playwright loads this module as CommonJS.
function defaultLocale(): Locale {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'en';
  return navigator.webdriver ? 'en' : 'zh-TW';
}

function storedLocale(): Locale | null {
  try {
    const value = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    return value === 'en' || value === 'zh-TW' ? value : null;
  } catch {
    return null;
  }
}

// Read once: module-level constants call __t at import time, so the locale cannot change mid-session.
const locale: Locale = storedLocale() ?? defaultLocale();

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  localStorage.setItem(STORAGE_KEY, next);
  window.location.reload();
}

export function __t(source: string, params?: readonly unknown[]): string {
  const template = locale === 'en' ? source : translations[source] || source;
  if (!params) return template;
  return template.replace(/\{\{(\d+)\}\}/g, (_, index: string) => String(params[Number(index)]));
}
