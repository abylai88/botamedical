import type { Metadata } from 'next';
import Link from 'next/link';
import { CartProvider } from '@/components/cart-provider';
import { Header } from '@/components/header';
import { publicDemo } from '@/lib/deployment';
import './globals.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'BOTA Group — медицинская одежда', template: '%s — BOTA Group' }, description: 'Медицинская одежда BOTA Group. Демонстрационная витрина.', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body><CartProvider><a className="skip-link" href="#main">Перейти к содержимому</a><Header publicDemo={publicDemo()} /><main id="main">{children}</main><footer className="site-footer"><div className="footer-brand"><Link href="/">BOTA <span>Group</span></Link><p>Медицинская одежда.<br/>Внимание к образу вашей профессии.</p></div><nav aria-label="Навигация в подвале"><Link href="/catalog">Каталог</Link><Link href="/info">Заказ и контакты</Link><Link href="/privacy">Данные и конфиденциальность</Link>{!publicDemo() ? <Link href="/admin">Управление магазином</Link> : null}</nav><p className="footer-note">Демонстрационный каталог. Условные цены, состав ассортимента и наличие не подтверждены. Оплата и доставка не подключены.</p></footer></CartProvider></body></html>;
}
