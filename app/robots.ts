import type { MetadataRoute } from 'next';
import { appOrigin, indexable } from '@/lib/deployment';
// Only the real shop is open to search engines; admin, API, cart and checkout never are.
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  if (!indexable()) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/cart', '/checkout'] }, sitemap: `${appOrigin()}/sitemap.xml` };
}
