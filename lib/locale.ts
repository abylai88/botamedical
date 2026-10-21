import 'server-only';
import { cookies } from 'next/headers';
import { dictionaries, LOCALE_COOKIE, toLocale } from './i18n.ts';
export async function getLocale() { return toLocale((await cookies()).get(LOCALE_COOKIE)?.value); }
export async function getDictionary() { const locale = await getLocale(); return { locale, t: dictionaries[locale] }; }
