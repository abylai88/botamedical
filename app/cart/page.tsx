import { publicDemo } from '@/lib/deployment';
import { products } from '@/lib/db';
import { CartView } from '@/components/cart-view';
export const metadata = { title: 'Корзина' };
export default function CartPage() { return <div className="section"><div className="page-heading"><p className="section-kicker">Ваш выбор</p><h1>Корзина</h1></div><CartView products={products()} publicDemo={publicDemo()} /></div>; }
