import { products } from '@/lib/db';
import { CheckoutForm } from '@/components/checkout-form';
import Link from 'next/link';
import { publicDemo } from '@/lib/deployment';
import { issueFormToken } from '@/lib/form-token';
import { getDictionary } from '@/lib/locale';
export async function generateMetadata() { const { t } = await getDictionary(); return { title: t.checkout.title, robots: { index: false, follow: false } }; }
export default async function Checkout() { const { t } = await getDictionary(); const c = t.checkout; return <div className="section"><div className="page-heading"><p className="eyebrow">{c.kicker}</p><h1>{c.title}</h1></div>{publicDemo() ? <div className="empty"><h2>{c.closedTitle}</h2><p>{c.closedText}</p><Link href="/cart" className="button">{c.back}</Link></div> : <CheckoutForm products={products()} formToken={issueFormToken()} />}</div>; }
