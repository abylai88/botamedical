'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, uploadImage } from '@/lib/client-api';
import { SITE_IMAGE_FIELDS, SITE_TEXT_FIELDS, type SiteContent, type SiteImageKey, type SiteTextKey } from '@/lib/site-fields';
import type { Locale } from '@/lib/i18n';
import { ProductImage } from './product-image';

export type SiteDefaults = { texts: Record<Locale, Record<SiteTextKey, string>>; images: Record<SiteImageKey, string> };
const groups = [...new Set(SITE_TEXT_FIELDS.map(f => f.group))];
const languages: [Locale, string][] = [['ru', 'Русский'], ['en', 'English']];

export function SiteEditor({ content, defaults }: { content: SiteContent; defaults: SiteDefaults }) {
  const router = useRouter();
  const initial = () => Object.fromEntries(languages.map(([l]) => [l, Object.fromEntries(SITE_TEXT_FIELDS.map(f => [f.key, content.texts[l][f.key] || defaults.texts[l][f.key]]))])) as Record<Locale, Record<SiteTextKey, string>>;
  const [texts, setTexts] = useState(initial);
  const [images, setImages] = useState<Partial<Record<SiteImageKey, string>>>(content.images);
  const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState<SiteImageKey | null>(null);
  const [error, setError] = useState(''); const [saved, setSaved] = useState(false); const dirty = useRef(false);
  function change(locale: Locale, key: SiteTextKey, value: string) { setTexts(t => ({ ...t, [locale]: { ...t[locale], [key]: value } })); dirty.current = true; setSaved(false); }
  async function replace(key: SiteImageKey, file?: File) {
    if (!file) return; setError(''); setUploading(key);
    try { const url = await uploadImage(file); setImages(i => ({ ...i, [key]: url })); dirty.current = true; setSaved(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить изображение.'); } finally { setUploading(null); }
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try { await api('/api/admin/site', 'PUT', { texts, images }); dirty.current = false; setSaved(true); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Не удалось сохранить.'); } finally { setBusy(false); }
  }
  return <form className="site-editor" onSubmit={submit}>
    <div className="section-heading"><div><h2>Тексты и фото сайта</h2><p className="small muted">Меняйте тексты главной страницы и подвала на двух языках и фото главной. После правок нажмите «Сохранить» внизу. Пустое поле вернёт исходный текст.</p></div></div>
    <fieldset disabled={busy || !!uploading} className="site-editor-body">
      <section className="site-group"><h3>Фото главной страницы</h3><p className="small muted">Без своего фото здесь показывается главное фото соответствующего товара. Для фона первого экрана лучше всего подходит широкое горизонтальное фото (от 1920 px по ширине); поверх него сайт затемняет изображение, чтобы текст читался. JPG, PNG, WebP до 6 МБ.</p>
        <div className="site-images">{SITE_IMAGE_FIELDS.map(f => { const src = images[f.key] || defaults.images[f.key]; return <div key={f.key} className="site-image"><div className="editor-thumb"><ProductImage src={src} alt={f.label} sizes="160px" /></div><p className="small">{f.label}{images[f.key] ? '' : f.key === 'heroBg' ? ' · сейчас зелёный фон с логотипом' : ' · из товара'}</p>
          <div className="photo-order"><label className="text-button photo-replace">{uploading === f.key ? 'Загружаем…' : 'Заменить'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Заменить: ${f.label}`} onChange={e => { void replace(f.key, e.target.files?.[0]); e.target.value = ''; }} /></label>{images[f.key] ? <button type="button" className="text-button" onClick={() => { setImages(i => { const next = { ...i }; delete next[f.key]; return next; }); dirty.current = true; setSaved(false); }}>Вернуть исходное</button> : null}</div></div>; })}</div>
      </section>
      {groups.map(group => <section key={group} className="site-group"><h3>{group}</h3>
        {SITE_TEXT_FIELDS.filter(f => f.group === group).map(f => <div key={f.key} className="site-field"><p className="site-field-label">{f.label}</p><div className="site-field-langs">{languages.map(([l, name]) => {
          const value = texts[l][f.key]; const isDefault = value.trim() === defaults.texts[l][f.key];
          const props = { value, maxLength: f.max, lang: l, onChange: (e: { target: { value: string } }) => change(l, f.key, e.target.value), 'aria-label': `${f.label} — ${name}` };
          return <label key={l}><span className="site-lang">{name}{!isDefault ? <button type="button" className="text-button" onClick={() => change(l, f.key, defaults.texts[l][f.key])}>Исходный текст</button> : null}</span>{'multiline' in f && f.multiline ? <textarea rows={'rows' in f ? f.rows : 3} {...props} /> : <input {...props} />}</label>;
        })}</div></div>)}
      </section>)}
      <div className="site-save"><button className="button" type="submit">{busy ? 'Сохраняем…' : 'Сохранить тексты и фото'}</button>{saved ? <p role="status" className="comment-notice">Сохранено. Изменения уже на сайте.</p> : null}</div>
    </fieldset>
    {error ? <p className="error-message" role="alert">{error}</p> : null}
  </form>;
}
