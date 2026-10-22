// Storefront texts and photos the owner can change in the admin panel ("Сайт" tab).
// Defaults come from the dictionaries; only changed values are stored.
import { dictionaries, type Locale } from './i18n.ts';

export const SITE_TEXT_FIELDS = [
  { key: 'announce', group: 'Полоса над шапкой', label: 'Текст полосы', max: 160 },
  { key: 'home.kicker', group: 'Первый экран', label: 'Надпись над заголовком', max: 80 },
  { key: 'home.title', group: 'Первый экран', label: 'Заголовок', max: 120, multiline: true },
  { key: 'home.lead', group: 'Первый экран', label: 'Текст под заголовком', max: 300, multiline: true },
  { key: 'home.shopCoats', group: 'Первый экран', label: 'Кнопка 1', max: 40 },
  { key: 'home.shopLooks', group: 'Первый экран', label: 'Кнопка 2', max: 40 },
  { key: 'home.coatsTile', group: 'Плитки категорий', label: 'Плитка 1: заголовок', max: 60 },
  { key: 'home.coatsText', group: 'Плитки категорий', label: 'Плитка 1: текст', max: 160 },
  { key: 'home.looksTile', group: 'Плитки категорий', label: 'Плитка 2: заголовок', max: 60 },
  { key: 'home.looksText', group: 'Плитки категорий', label: 'Плитка 2: текст', max: 160 },
  { key: 'home.popular', group: 'Популярные модели', label: 'Заголовок', max: 80 },
  { key: 'home.teamKicker', group: 'Блок для команды', label: 'Надпись над заголовком', max: 80 },
  { key: 'home.teamTitle', group: 'Блок для команды', label: 'Заголовок', max: 120, multiline: true },
  { key: 'home.teamText', group: 'Блок для команды', label: 'Текст', max: 400, multiline: true },
  { key: 'home.teamCta', group: 'Блок для команды', label: 'Кнопка', max: 40 },
  { key: 'home.reviewsLead', group: 'Отзывы', label: 'Заголовок', max: 100 },
  { key: 'home.brandKicker', group: 'О бренде', label: 'Надпись над заголовком', max: 80 },
  { key: 'home.brandTitle', group: 'О бренде', label: 'Заголовок', max: 120, multiline: true },
  { key: 'home.brandText', group: 'О бренде', label: 'Текст', max: 600, multiline: true },
  { key: 'home.brandCta', group: 'О бренде', label: 'Ссылка', max: 40 },
  { key: 'footer.tagline', group: 'Подвал сайта', label: 'Строка под логотипом', max: 160, multiline: true },
  { key: 'footer.infoTitle', group: 'Подвал сайта', label: 'Информационный блок: заголовок', max: 80 },
  { key: 'footer.infoText', group: 'Подвал сайта', label: 'Информационный блок: текст (адрес, телефон, график)', max: 1200, multiline: true, rows: 5 },
  { key: 'footer.note', group: 'Подвал сайта', label: 'Примечание внизу', max: 400, multiline: true },
  // Shown to a customer when an order cannot be accepted. One number is enough; the Russian value wins.
  { key: 'contact.whatsapp', group: 'Контакты', label: 'WhatsApp для связи, номер (например, +7 777 123 45 67)', max: 30 },
] as const;
export type SiteTextKey = (typeof SITE_TEXT_FIELDS)[number]['key'];
export const SITE_TEXT_KEYS = SITE_TEXT_FIELDS.map(f => f.key) as SiteTextKey[];

export const SITE_IMAGE_FIELDS = [
  { key: 'heroBg', label: 'Первый экран: фон' },
  { key: 'hero1', label: 'Первый экран: левое фото' },
  { key: 'hero2', label: 'Первый экран: центральное фото' },
  { key: 'hero3', label: 'Первый экран: правое фото' },
  { key: 'tileCoats', label: 'Плитка 1 (халаты)' },
  { key: 'tileLooks', label: 'Плитка 2 (хирургические костюмы)' },
  { key: 'brand', label: 'Блок «О бренде»' },
] as const;
export type SiteImageKey = (typeof SITE_IMAGE_FIELDS)[number]['key'];
export const SITE_IMAGE_KEYS = SITE_IMAGE_FIELDS.map(f => f.key) as SiteImageKey[];

export type SiteContent = { texts: Record<Locale, Partial<Record<SiteTextKey, string>>>; images: Partial<Record<SiteImageKey, string>> };
export const emptySiteContent = (): SiteContent => ({ texts: { ru: {}, en: {} }, images: {} });

export function defaultText(locale: Locale, key: SiteTextKey): string {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dictionaries[locale]);
  return typeof value === 'string' ? value : '';
}
export function siteText(content: SiteContent, locale: Locale, key: SiteTextKey) {
  return content.texts[locale][key] || defaultText(locale, key);
}
