import { cookies } from 'next/headers';
import { COOKIE, session } from '@/lib/auth';
import { db, products, orders } from '@/lib/db';
import { AdminLogin } from '@/components/admin-login';
import { AdminDashboard } from '@/components/admin-dashboard';
import { notFound } from 'next/navigation';
import { publicDemo } from '@/lib/deployment';
export const metadata = { title: 'Управление магазином', robots: { index: false, follow: false } };
export default async function AdminPage() {
  if (publicDemo()) notFound();
  const admin = session((await cookies()).get(COOKIE)?.value);
  if (!admin) return <AdminLogin configured={!!db().prepare('SELECT username FROM admins LIMIT 1').get()} />;
  return <AdminDashboard username={admin.username} products={products(true)} orders={orders()} />;
}
