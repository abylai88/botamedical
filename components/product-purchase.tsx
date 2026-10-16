'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './cart-provider';
import { type Product, money } from '@/lib/types';
export function ProductPurchase({ product }: { product: Product }) {
  const { add, ready, notice } = useCart(); const [size, setSize] = useState(''); const [color, setColor] = useState(''); const [quantity, setQuantity] = useState(1); const [message, setMessage] = useState('');
  return <form className="purchase" onSubmit={e => { e.preventDefault(); const ok = add({ productId: product.id, size, color, quantity }); setMessage(ok ? 'Товар добавлен в корзину.' : 'Не удалось добавить товар: проверьте лимит корзины.'); }}><p className="product-price">{money(product.price)}</p><p className="small muted">Демонстрационная цена в условных единицах.</p>
    {product.sizes.length ? <label>Размер <select value={size} onChange={e => { setSize(e.target.value); setMessage(''); }} required><option value="">Выберите размер</option>{product.sizes.map(s => <option key={s}>{s}</option>)}</select></label> : <p className="data-note">Размерная сетка пока не добавлена.</p>}
    {product.colors.length ? <label>Цвет <select value={color} onChange={e => { setColor(e.target.value); setMessage(''); }} required><option value="">Выберите цвет</option>{product.colors.map(c => <option key={c}>{c}</option>)}</select></label> : <p className="small muted">Доступные цвета и наличие требуют подтверждения.</p>}
    <div className="purchase-actions"><label className="quantity-field">Количество<input name="quantity" type="number" min={1} max={20} value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))} /></label><button className="button" disabled={!ready}>В корзину</button></div><div aria-live="polite" className="purchase-feedback">{message ? <><p>{message}</p><Link href="/cart" className="text-link">Перейти в корзину</Link></> : null}{notice ? <p>{notice}</p> : null}</div>
  </form>;
}
