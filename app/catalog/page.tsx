import Link from 'next/link';
import { products } from '@/lib/db';
import { ProductCard } from '@/components/product-card';
export const metadata = { title: 'Каталог' };
export default async function Catalog({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; sort?: string }> }) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.slice(0, 120) : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const all = products(); const categories = [...new Set(all.map(p => p.category))];
  const filtered = all.filter(p => (!category || p.category === category) && `${p.name} ${p.description}`.toLocaleLowerCase('ru').includes(q.toLocaleLowerCase('ru')));
  if (params.sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (params.sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  return <div className="section catalog-page"><div className="page-heading"><p className="breadcrumb"><Link href="/">Главная</Link> / Каталог</p><h1>Медицинская одежда</h1><p>Силуэты и образы BOTA Group.</p></div><p className="demo-note">Демонстрационный ассортимент. Цены указаны в условных единицах; варианты и наличие требуют подтверждения.</p><form className="catalog-filters" method="get"><label className="search-field">Поиск<input type="search" name="q" defaultValue={q} placeholder="Название модели…" maxLength={120} /></label><label>Категория<select name="category" defaultValue={category}><option value="">Все категории</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Порядок<select name="sort" defaultValue={params.sort || ''}><option value="">По умолчанию</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select></label><button className="button" type="submit">Показать</button></form><div className="catalog-result"><p role="status">Найдено моделей: {filtered.length}</p>{q || category || params.sort ? <Link href="/catalog" className="text-link">Сбросить фильтры</Link> : null}</div>{filtered.length ? <div className="product-grid catalog-grid">{filtered.map(p => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty"><h2>Пока ничего не нашлось</h2><p>Попробуйте другое название или откройте все категории.</p><Link href="/catalog" className="button">Все модели</Link></div>}</div>;
}
