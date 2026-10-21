import Link from 'next/link';
import { products } from '@/lib/db';
import { getDictionary } from '@/lib/locale';
import { localized } from '@/lib/i18n';
import { ProductCard } from '@/components/product-card';
export async function generateMetadata() { const { t } = await getDictionary(); return { title: t.catalog.title }; }
export default async function Catalog({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; sort?: string }> }) {
  const { locale, t } = await getDictionary(); const c = t.catalog;
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.slice(0, 120) : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const all = products();
  // Filter values stay the stored Russian category; labels follow the selected language.
  const categories = [...new Map(all.map(p => [p.category, localized(p, locale).category])).entries()];
  const needle = q.toLocaleLowerCase(locale);
  const filtered = all.filter(p => (!category || p.category === category) && [p.name, p.description, p.nameEn, p.descriptionEn].filter(Boolean).join(' ').toLocaleLowerCase(locale).includes(needle));
  if (params.sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (params.sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  const heading = categories.find(([value]) => value === category)?.[1] || c.heading;
  return <div className="section catalog-page"><div className="page-heading"><p className="breadcrumb"><Link href="/">{c.home}</Link> / {c.title}</p><h1>{heading}</h1><p>{c.lead}</p></div>
    <nav className="category-chips" aria-label={c.category}><Link href="/catalog" aria-current={!category ? 'page' : undefined}>{c.allCategories}</Link>{categories.map(([value, label]) => <Link key={value} href={`/catalog?category=${encodeURIComponent(value)}`} aria-current={category === value ? 'page' : undefined}>{label}</Link>)}</nav>
    <form className="catalog-filters" method="get"><label className="search-field">{c.search}<input type="search" name="q" defaultValue={q} placeholder={c.searchPlaceholder} maxLength={120} /></label><label>{c.category}<select name="category" defaultValue={category}><option value="">{c.allCategories}</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>{c.sort}<select name="sort" defaultValue={params.sort || ''}><option value="">{c.sortDefault}</option><option value="price-asc">{c.sortAsc}</option><option value="price-desc">{c.sortDesc}</option></select></label><button className="button" type="submit">{c.apply}</button></form>
    <div className="catalog-result"><p role="status">{c.found(filtered.length)}</p>{q || category || params.sort ? <Link href="/catalog" className="text-link">{c.reset}</Link> : null}</div>
    {filtered.length ? <div className="product-grid catalog-grid">{filtered.map(p => <ProductCard key={p.id} product={p} locale={locale} />)}</div> : <div className="empty"><h2>{c.emptyTitle}</h2><p>{c.emptyText}</p><Link href="/catalog" className="button">{c.emptyCta}</Link></div>}</div>;
}
