'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/client-api';
export function AdminLogin({ configured }: { configured: boolean }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPending(true); setError('');
    const data = new FormData(e.currentTarget);
    try { await api('/api/auth/login', 'POST', { username: data.get('username'), password: data.get('password') }); window.location.assign('/admin'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось войти.'); } finally { setPending(false); }
  }
  return <div className="login-wrap"><p className="section-kicker">BOTA / Управление</p><h1>Вход в магазин</h1><p className="muted">Каталог, фотографии, заказы и отзывы.</p>{configured ? <form className="stack-form" onSubmit={submit}><label>Имя пользователя<input name="username" autoComplete="username" required minLength={3} maxLength={64} spellCheck={false} /></label><label>Пароль<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>{error ? <p role="alert" className="error-message">{error}</p> : null}<button className="button" disabled={pending}>{pending ? 'Входим…' : 'Войти'}</button></form> : <div className="setup-note"><h2>Создайте администратора</h2><p>В терминале проекта выполните <code>npm run admin:create</code>. Придумайте имя и пароль. После создания обновите эту страницу.</p><p className="small">Публичной регистрации и стандартного пароля нет.</p></div>}</div>;
}
