import { publicDemo } from '@/lib/deployment';
import { getDictionary } from '@/lib/locale';
export async function generateMetadata() { const { t } = await getDictionary(); return { title: t.privacy.title }; }
export default async function Privacy() {
  const { t } = await getDictionary(); const p = t.privacy; const mode = publicDemo() ? 'demo' : 'orders';
  return <div className="section reading-page"><h1>{p.title}</h1><p className="lead">{p.lead}</p><p className="small muted">{p.updated}</p>{p.sections.filter(s => !s.only || s.only === mode).map(s => <section key={s.title}><h2>{s.title}</h2>{s.text.map(line => <p key={line}>{line}</p>)}</section>)}<p className="small muted">{p.legal}</p></div>;
}
