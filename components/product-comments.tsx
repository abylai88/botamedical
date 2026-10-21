'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
import type { ProductComment } from '@/lib/types';
import { useLocale } from './locale-provider';

export function ProductComments({ productId, comments, enabled }: { productId: string; comments: ProductComment[]; enabled: boolean }) {
  const router = useRouter(); const { locale, t } = useLocale(); const c = t.comments;
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ru-RU', { dateStyle: 'long', timeZone: 'Europe/Moscow' });
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setPending(true); setError(''); setNotice('');
    try {
      await api(`/api/products/${productId}/comments`, 'POST', { author: String(data.get('author') || '').trim(), body: String(data.get('body') || '').trim(), website: String(data.get('website') || '') });
      form.reset(); setNotice(c.thanks); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : c.failed); }
    finally { setPending(false); }
  }
  return <section className="product-comments" aria-labelledby={`comments-${productId}`}>
    <div className="section-heading"><h2 id={`comments-${productId}`}>{c.title}</h2><p className="small muted">{comments.length ? `${comments.length}` : c.none}</p></div>
    {comments.length ? <ol className="comment-list">{comments.map(comment => <li key={comment.id} className="comment">
      <p className="comment-meta"><strong>{comment.author}</strong>{comment.staff ? <span className="comment-badge">{c.staff}</span> : null}<time dateTime={comment.createdAt}>{date.format(new Date(comment.createdAt))}</time></p>
      <p className="comment-body">{comment.body}</p>
    </li>)}</ol> : <p className="small muted">{c.first}</p>}
    {enabled ? <form className="comment-form" onSubmit={submit}>
      <fieldset disabled={pending}>
        <label>{c.name}<input name="author" required minLength={2} maxLength={60} autoComplete="nickname" /></label>
        <label>{c.body}<textarea name="body" required minLength={2} maxLength={1000} rows={4} placeholder={c.placeholder} /></label>
        {/* Hidden from people; bots that fill every field are rejected. */}
        <label className="comment-trap" aria-hidden="true">{c.trap}<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <p className="small muted">{c.rules}</p>
        <button className="button" type="submit">{pending ? c.sending : c.send}</button>
      </fieldset>
      <div aria-live="polite">{notice ? <p className="comment-notice">{notice}</p> : null}{error ? <p className="error-message" role="alert">{error}</p> : null}</div>
    </form> : <p className="demo-note">{c.closed}</p>}
  </section>;
}
