import { publicDemo } from '@/lib/deployment';
import Link from 'next/link';
import { getDictionary } from '@/lib/locale';
export async function generateMetadata() { const { t } = await getDictionary(); return { title: t.info.title }; }
export default async function Info() { const { t } = await getDictionary(); const i = t.info; const closed = publicDemo(); return <div className="section reading-page"><p className="breadcrumb"><Link href="/">{i.home}</Link> / {i.crumb}</p><h1>{i.title}</h1><p className="lead">{closed ? i.leadClosed : i.lead}</p><h2>{i.howTitle}</h2><p>{closed ? i.howClosed : i.how}</p><h2>{i.teamTitle}</h2><p>{i.team}</p><h2>{i.payTitle}</h2><p>{i.pay}</p><h2>{i.contactsTitle}</h2><p>{i.contacts}</p><Link href="/catalog" className="button">{i.cta}</Link></div>; }
