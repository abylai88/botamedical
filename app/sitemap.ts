import type { MetadataRoute } from 'next';
import { products } from '@/lib/db';
import { appOrigin, indexable } from '@/lib/deployment';
import { COATS_CATEGORY, SCRUBS_CATEGORY, categoryHref } from '@/lib/categories';
// Public pages and every visible product, for search engines. Empty outside the real shop.
export const dynamic = 'force-dynamic';
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexable()) return [];
  const origin = appOrigin();
  const pages = ['/', '/catalog', categoryHref(COATS_CATEGORY), categoryHref(SCRUBS_CATEGORY), '/about', '/info', '/privacy'];
  return [...pages.map(path => ({ url: origin + path })), ...products().map(p => ({ url: `${origin}/catalog/${p.id}` }))];
}
