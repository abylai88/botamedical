'use client';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { useCart } from './cart-provider';
import { useLocale } from './locale-provider';
import { api } from '@/lib/client-api';
import { type Product, lineKey } from '@/lib/types';
import { localized, money } from '@/lib/i18n';
import { orderSchema } from '@/lib/validation';
export function CheckoutForm({ products }: { products: Product[] }) {
  const { lines, ready, clear } = useCart(); const { locale, t } = useLocale(); const c = t.checkout;
  const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [fields, setFields] = useState<Record<string, string>>({}); const [orderId, setOrderId] = useState('');
  const attempt = useRef({ fingerprint: '', id: '' }); const errorRef = useRef<HTMLDivElement>(null);
  const entries = lines.map(line => ({ line, p: products.find(p => p.id === line.productId) }));
  const total = entries.reduce((sum, { line, p }) => sum + (p?.price || 0) * line.quantity, 0);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (pending) return; setError(''); setFields({}); const form = e.currentTarget; const data = new FormData(form);
    const payload = { items: entries.map(({ line, p }) => ({ ...line, expectedPrice: p?.price || 0 })), customer: { name: String(data.get('name') || ''), phone: String(data.get('phone') || ''), email: String(data.get('email') || ''), note: String(data.get('note') || '') }, consent: data.get('consent') === 'on' };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    const result = orderSchema.safeParse({ ...payload, requestId: attempt.current.id });
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) { const key = String(issue.path.at(-1)); errors[key] = key === 'phone' ? c.errPhone : key === 'name' ? c.errName : key === 'consent' ? c.errConsent : c.errValue; }
      setFields(errors); const first = form.elements.namedItem(Object.keys(errors)[0]); if (first instanceof HTMLElement) first.focus(); return;
    }
    setPending(true);
    try { const response = await api<{ id: string }>('/api/orders', 'POST', result.data); setOrderId(response.id); clear(); }
    catch (e) { setError(e instanceof Error ? e.message : c.network); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setPending(false); }
  }
  if (orderId) return <div className="order-success" role="status"><span className="success-symbol" aria-hidden="true">✓</span><h2>{c.doneTitle}</h2><p>{c.doneNumber}: <strong className="order-id">{orderId}</strong></p><p>{c.doneText}</p><Link href="/catalog" className="button">{c.doneBack}</Link></div>;
  if (!ready) return <p role="status">{t.cart.loading}</p>;
  if (!lines.length) return <div className="empty"><h2>{c.emptyTitle}</h2><Link href="/catalog" className="button">{c.emptyCta}</Link></div>;
  if (entries.some(({ p, line }) => !p || (p.sizes.length ? !p.sizes.includes(line.size) : !!line.size) || (p.colors.length ? !p.colors.includes(line.color) : !!line.color))) return <div className="empty"><h2>{c.staleTitle}</h2><p>{c.staleText}</p><Link href="/cart" className="button">{c.back}</Link></div>;
  const labels = { name: c.name, phone: c.phone, email: c.email };
  return <div className="checkout-layout"><form className="checkout-form" noValidate onSubmit={submit} onChange={e => {
    const target = e.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      setFields(current => { const next = { ...current }; delete next[target.name]; return next; });
    }
  }}><h2>{c.contacts}</h2><p className="muted">{c.contactsText}</p>{(['name', 'phone', 'email'] as const).map(key => <label key={key}>{labels[key]}<input name={key} type={key === 'phone' ? 'tel' : key === 'email' ? 'email' : 'text'} disabled={pending} autoComplete={key === 'phone' ? 'tel' : key} maxLength={key === 'phone' ? 30 : key === 'email' ? 160 : 100} required={key !== 'email'} aria-invalid={!!fields[key]} aria-describedby={fields[key] ? `${key}-error` : undefined} />{fields[key] ? <span className="field-error" role="alert" id={`${key}-error`}>{fields[key]}</span> : null}</label>)}<label>{c.note}<textarea disabled={pending} name="note" maxLength={1000} rows={3} /></label><label className="checkbox-label"><input type="checkbox" name="consent" disabled={pending} aria-describedby={fields.consent ? 'consent-error' : undefined} required aria-invalid={!!fields.consent} /><span>{c.consent} <Link href="/privacy" className="text-link">{c.howStored}</Link></span></label>{fields.consent ? <p id="consent-error" className="field-error" role="alert">{fields.consent}</p> : null}{error ? <div ref={errorRef} tabIndex={-1} role="alert" className="error-message">{error} <Link href="/cart">{c.openCart}</Link></div> : null}<button className="button full" disabled={pending}>{pending ? c.saving : c.submit}</button><p className="small muted">{c.submitNote}</p></form><aside className="checkout-summary"><h2>{c.summary}</h2>{entries.map(({ line, p }) => <div className="checkout-line" key={lineKey(line)}><div><p>{localized(p!, locale).name}</p><small>{[line.size, line.color].filter(Boolean).join(' / ')}{line.size || line.color ? ', ' : ''}{line.quantity} {c.pcs}</small></div><span>{money(p!.price * line.quantity, locale)}</span></div>)}<p className="summary-row total"><span>{t.cart.total}</span><strong>{money(total, locale)}</strong></p><p className="small muted">{c.deliveryNote}</p><Link href="/cart" className="text-link">{c.editCart}</Link></aside></div>;
}
