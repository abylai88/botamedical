import 'server-only';
import { z } from 'zod';
import { db, product } from './db.ts';
import { LOCALES, type Locale } from './i18n.ts';
import { SITE_IMAGE_KEYS, SITE_TEXT_FIELDS, defaultText, emptySiteContent, siteText, type SiteContent, type SiteImageKey, type SiteTextKey } from './site-fields.ts';

const KEY = 'site-content-v1';
const imagePath = z.string().regex(/^\/(?:images\/[a-z0-9-]+\.webp|media\/[a-f0-9-]{36}\.webp)$/);
const clean = (s: string) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s);
const localeTexts = z.object(Object.fromEntries(SITE_TEXT_FIELDS.map(f => [f.key, z.string().max(f.max).refine(clean).optional()]))).strict();
export const siteSchema = z.object({
  texts: z.object({ ru: localeTexts, en: localeTexts }).strict(),
  images: z.object(Object.fromEntries(SITE_IMAGE_KEYS.map(k => [k, imagePath.optional()]))).strict(),
}).strict();

export function getSiteContent(): SiteContent {
  const row = db().prepare('SELECT value FROM meta WHERE key=?').get(KEY) as { value: string } | undefined;
  if (!row) return emptySiteContent();
  const parsed = siteSchema.safeParse(JSON.parse(row.value));
  return parsed.success ? parsed.data as SiteContent : emptySiteContent();
}

// Keeps only values that differ from the built-in text, so later copy updates still reach untouched fields.
export function saveSiteContent(input: z.infer<typeof siteSchema>) {
  const content = emptySiteContent();
  for (const locale of LOCALES) for (const field of SITE_TEXT_FIELDS) {
    const value = input.texts[locale][field.key]?.replace(/\r\n/g, '\n').trim();
    if (value && value !== defaultText(locale, field.key)) content.texts[locale][field.key] = value;
  }
  for (const key of SITE_IMAGE_KEYS) if (input.images[key]) content.images[key] = input.images[key];
  db().prepare('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(KEY, JSON.stringify(content));
  return content;
}

// wa.me link for the WhatsApp number from the "Сайт" tab, or null when none is set.
export function whatsappLink(content = getSiteContent()) {
  const digits = (content.texts.ru['contact.whatsapp'] || content.texts.en['contact.whatsapp'] || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}
export function siteTexts(locale: Locale, content = getSiteContent()) {
  return (key: SiteTextKey) => siteText(content, locale, key);
}

// Without an uploaded override, home photos follow the main photo of the matching product.
const fallbacks: Partial<Record<SiteImageKey, [string, string]>> = {
  hero1: ['look-02', '/images/look-02.webp'], hero2: ['look-01', '/images/look-01.webp'], hero3: ['look-03', '/images/look-03.webp'],
  tileCoats: ['bota-coat', '/images/coat.webp'], tileLooks: ['look-03', '/images/look-03.webp'], brand: ['look-01', '/images/look-01.webp'],
};
// The hero background has no product fallback: without an upload it is the green logo backdrop.
export function defaultSiteImage(key: SiteImageKey) {
  const fallback = fallbacks[key]; if (!fallback) return '';
  const [id, file] = fallback; const item = product(id);
  return item?.active && item.images.length ? item.images[0] : file;
}
export function siteImage(key: SiteImageKey, content = getSiteContent()) {
  return content.images[key] || defaultSiteImage(key);
}
