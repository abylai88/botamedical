import Link from 'next/link';
import { ProductImage } from './product-image';
import { type Product, money } from '@/lib/types';
export function ProductCard({ product }: { product: Product }) {
  return <article className="product-card"><Link href={`/catalog/${product.id}`} className="card-photo" aria-label={`Открыть ${product.name}`}><ProductImage src={product.images[0]} alt={product.name} /><span className="card-tag">Демо</span><span className="card-open" aria-hidden="true">Смотреть модель</span></Link><div className="card-copy"><div><p className="small muted">{product.category}</p><h3><Link href={`/catalog/${product.id}`}>{product.name}</Link></h3></div><p className="card-price">{money(product.price)}</p></div><p className="small muted">{product.sizes.length ? `Размеры: ${product.sizes.join(', ')}` : 'Размеры уточняются'}</p></article>;
}
