import Link from 'next/link';
import { getDictionary } from '@/lib/locale';
export default async function NotFound() { const { t } = await getDictionary(); return <div className="empty section"><p className="eyebrow">404</p><h1>{t.notFound.title}</h1><p>{t.notFound.text}</p><Link className="button" href="/catalog">{t.notFound.cta}</Link></div>; }
