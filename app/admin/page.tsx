import { cookies } from 'next/headers';
import { COOKIE, session } from '@/lib/auth';
import { db, products, orderPage, orderCounts, purgeOldSpam } from '@/lib/db';
import { AdminLogin } from '@/components/admin-login';
import { AdminDashboard } from '@/components/admin-dashboard';
import { notFound } from 'next/navigation';
import { publicDemo } from '@/lib/deployment';
import { recentComments } from '@/lib/comments';
import { defaultSiteImage, getSiteContent } from '@/lib/site';
import { SITE_IMAGE_KEYS, SITE_TEXT_KEYS, defaultText } from '@/lib/site-fields';
export const metadata = { title: 'Управление магазином', robots: { index: false, follow: false } };
const tabs = ['products', 'orders', 'unprocessed', 'spam', 'comments', 'site'] as const;
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  if (publicDemo()) notFound();
  const admin = session((await cookies()).get(COOKIE)?.value);
  if (!admin) return <AdminLogin configured={!!db().prepare('SELECT username FROM admins LIMIT 1').get()} />;
  const siteDefaults = {
    texts: { ru: Object.fromEntries(SITE_TEXT_KEYS.map(k => [k, defaultText('ru', k)])), en: Object.fromEntries(SITE_TEXT_KEYS.map(k => [k, defaultText('en', k)])) },
    images: Object.fromEntries(SITE_IMAGE_KEYS.map(k => [k, defaultSiteImage(k)])),
  } as Parameters<typeof AdminDashboard>[0]['siteDefaults'];
  const query = await searchParams; const initialTab = tabs.find(t => t === query.tab) || 'products';
  purgeOldSpam();
  const ordersPage = orderPage(initialTab === 'unprocessed' ? 'new' : initialTab === 'spam' ? 'spam' : 'all', Number(query.page));
  return <AdminDashboard initialTab={initialTab} username={admin.username} products={products(true)} ordersPage={ordersPage} orderCounts={orderCounts()} comments={recentComments()} site={getSiteContent()} siteDefaults={siteDefaults} />;
}
