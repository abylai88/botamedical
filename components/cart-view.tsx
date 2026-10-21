'use client';
import Link from 'next/link';
import { useCart } from './cart-provider';
import { useLocale } from './locale-provider';
import { ProductImage } from './product-image';
import { type Product, lineKey } from '@/lib/types';
import { localized, money } from '@/lib/i18n';
export function CartView({ products, publicDemo = false }: { products: Product[]; publicDemo?: boolean }) {
  const { lines, ready, update, remove, notice } = useCart(); const { locale, t } = useLocale(); const c = t.cart;
  if (!ready) return <p role="status">{c.loading}</p>;
  if (!lines.length) return <div className="empty"><h2>{c.emptyTitle}</h2><p>{c.emptyText}</p><Link href="/catalog" className="button">{c.open}</Link></div>;
  const entries = lines.map(line => { const p = products.find(item => item.id === line.productId); return { line, p, name: p ? localized(p, locale).name : '' }; });
  const valid = entries.every(({ line, p }) => p && (!p.sizes.length ? line.size === '' : p.sizes.includes(line.size)) && (!p.colors.length ? line.color === '' : p.colors.includes(line.color)));
  const total = entries.reduce((sum, { line, p }) => sum + (p?.price || 0) * line.quantity, 0);
  return <><div className="cart-layout"><div className="cart-items">{entries.map(({ line, p, name }) => <article className="cart-item" key={lineKey(line)}><Link href={p ? `/catalog/${p.id}` : '/catalog'} className="cart-photo"><ProductImage src={p?.images[0]} alt={name || c.removed} sizes="150px" /></Link><div className="cart-item-copy"><h2>{p ? <Link href={`/catalog/${p.id}`}>{name}</Link> : c.unavailable}</h2><p className="small muted">{[line.size, line.color].filter(Boolean).join(' / ') || c.noVariants}</p><p>{p ? money(p.price, locale) : c.removeToContinue}</p><button className="text-button" onClick={() => remove(lineKey(line))} aria-label={c.removeLabel(name || c.item)}>{c.remove}</button></div><div className="cart-quantity"><label>{c.quantity}<input aria-label={c.quantityLabel(name || c.item)} type="number" min={1} max={20} value={line.quantity} onChange={e => update(lineKey(line), Number(e.target.value) || 1)} /></label><strong>{p ? money(p.price * line.quantity, locale) : '—'}</strong></div></article>)}</div><aside className="cart-summary"><h2>{c.summary}</h2><p className="summary-row"><span>{c.units}</span><span>{lines.reduce((n, l) => n + l.quantity, 0)}</span></p><p className="summary-row total"><span>{c.total}</span><strong>{money(total, locale)}</strong></p><p className="small">{c.payNote}</p>{valid ? <Link className="button full" href="/checkout">{publicDemo ? c.checkoutClosed : c.checkout}</Link> : <p role="alert" className="error-message">{c.changed}</p>}<Link href="/catalog" className="text-link">{c.continue}</Link></aside></div><p className="small muted">{publicDemo ? c.closedNote : c.priceNote}</p>{notice ? <p role="status">{notice}</p> : null}</>;
}
