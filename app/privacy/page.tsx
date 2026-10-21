import { publicDemo } from '@/lib/deployment';
import { getDictionary } from '@/lib/locale';
export async function generateMetadata() { const { t } = await getDictionary(); return { title: t.privacy.title }; }
export default async function Privacy() { const { t } = await getDictionary(); const p = t.privacy; return <div className="section reading-page"><h1>{p.title}</h1><p className="lead">{p.lead}</p><h2>{p.cartTitle}</h2><p>{p.cart}</p>{publicDemo() ? <><h2>{p.closedTitle}</h2><p>{p.closed}</p></> : <><h2>{p.ordersTitle}</h2><p>{p.orders}</p><h2>{p.commentsTitle}</h2><p>{p.comments}</p><h2>{p.sessionTitle}</h2><p>{p.session}</p></>}<h2>{p.operatorTitle}</h2><p>{p.operator}</p></div>; }
