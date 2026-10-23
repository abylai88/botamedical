import type { MetadataRoute } from 'next';
import { appOrigin, indexable } from '@/lib/deployment';
// Only the real shop is open to search engines. Admin, cart and checkout also carry noindex in their own metadata.
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  if (!indexable()) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/cart', '/checkout'] }, sitemap: `${appOrigin()}/sitemap.xml` };
}
