'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './cart-provider';
import { useLocale } from './locale-provider';
import type { Product } from '@/lib/types';
import { money } from '@/lib/i18n';
export function ProductPurchase({ product }: { product: Product }) {
  const { add, ready, notice } = useCart(); const { locale, t } = useLocale(); const p = t.purchase;
  const [size, setSize] = useState(''); const [color, setColor] = useState(''); const [quantity, setQuantity] = useState(1); const [message, setMessage] = useState('');
  return <form className="purchase" onSubmit={e => { e.preventDefault(); const ok = add({ productId: product.id, size, color, quantity }); setMessage(ok ? p.added : p.failed); }}><p className="product-price">{money(product.price, locale)}</p>
    {product.sizes.length ? <fieldset className="option-group"><legend>{p.size}</legend><div className="option-pills">{product.sizes.map(s => <label key={s} className="pill"><input type="radio" name="size" value={s} checked={size === s} onChange={() => { setSize(s); setMessage(''); }} required /><span>{s}</span></label>)}</div></fieldset> : <p className="data-note">{p.noSizes}</p>}
    {product.colors.length ? <fieldset className="option-group"><legend>{p.color}</legend><div className="option-pills">{product.colors.map(c => <label key={c} className="pill"><input type="radio" name="color" value={c} checked={color === c} onChange={() => { setColor(c); setMessage(''); }} required /><span>{c}</span></label>)}</div></fieldset> : <p className="small muted">{p.noColors}</p>}
    <div className="purchase-actions"><label className="quantity-field">{p.quantity}<input name="quantity" type="number" min={1} max={20} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label><button className="button" disabled={!ready}>{p.add}</button></div><div aria-live="polite" className="purchase-feedback">{message ? <><p>{message}</p><Link href="/cart" className="text-link">{p.goCart}</Link></> : null}{notice ? <p>{notice}</p> : null}</div>
  </form>;
}
