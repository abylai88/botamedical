import Link from 'next/link';
import { ProductImage } from './product-image';
import type { Product } from '@/lib/types';
import { dictionaries, localized, money, type Locale } from '@/lib/i18n';
export function ProductCard({ product, locale }: { product: Product; locale: Locale }) {
  const t = dictionaries[locale].card; const { name, category } = localized(product, locale);
  return <article className="product-card"><Link href={`/catalog/${product.id}`} className="card-photo" aria-label={t.open(name)}><ProductImage src={product.images[0]} alt={name} sizes="(max-width: 760px) 50vw, 25vw" />{product.images[1] ? <span className="card-alt" aria-hidden="true"><ProductImage src={product.images[1]} alt="" sizes="(max-width: 760px) 50vw, 25vw" /></span> : null}<span className="card-tag">{category}</span><span className="card-open" aria-hidden="true">{t.quick}</span></Link><div className="card-copy"><h3><Link href={`/catalog/${product.id}`}>{name}</Link></h3><p className="card-price">{money(product.price, locale)}</p></div><p className="card-meta">{product.sizes.length ? t.sizes(product.sizes.join(', ')) : t.sizesSoon}</p></article>;
}
