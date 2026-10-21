'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { dictionaries, LOCALE_COOKIE, LOCALES, type Locale } from '@/lib/i18n';
const Context = createContext<Locale>('ru');
export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <Context.Provider value={locale}>{children}</Context.Provider>;
}
export function useLocale() { const locale = useContext(Context); return { locale, t: dictionaries[locale] }; }
export function LanguageSwitch() {
  const { locale, t } = useLocale(); const router = useRouter();
  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    router.refresh();
  }
  return <div className="lang-switch" role="group" aria-label={t.nav.language}>{LOCALES.map(code => <button key={code} type="button" aria-pressed={code === locale} lang={code} onClick={() => choose(code)}>{code.toUpperCase()}</button>)}</div>;
}
