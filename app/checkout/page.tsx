import { products } from '@/lib/db';
import { CheckoutForm } from '@/components/checkout-form';
import Link from 'next/link';
import { publicDemo } from '@/lib/deployment';
export const metadata = { title: 'Тестовый заказ' };
export default function Checkout() { return <div className="section"><div className="page-heading"><p className="section-kicker">Без оплаты</p><h1>Оформление заказа</h1></div>{publicDemo() ? <div className="empty"><h2>Пока только знакомство</h2><p>Это временная демонстрация BOTA Group. Каталог и корзина доступны, но заказы и контактные данные здесь не принимаются.</p><Link href="/cart" className="button">Вернуться в корзину</Link></div> : <CheckoutForm products={products()} />}</div>; }
