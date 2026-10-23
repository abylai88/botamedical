import { publicDemo } from '@/lib/deployment';
import { products } from '@/lib/db';
import { getDictionary } from '@/lib/locale';
import { CartView } from '@/components/cart-view';
export async function generateMetadata() { const { t } = await getDictionary(); return { title: t.cart.title, robots: { index: false, follow: false } }; }
export default async function CartPage() { const { t } = await getDictionary(); return <div className="section"><div className="page-heading"><p className="eyebrow">{t.cart.kicker}</p><h1>{t.cart.title}</h1></div><CartView products={products()} publicDemo={publicDemo()} /></div>; }
