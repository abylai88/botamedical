'use client';
import { useRef, useState } from 'react';
import { ProductImage } from './product-image';
import { useLocale } from './locale-provider';
export function Gallery({ images, name, hero = false }: { images: string[]; name: string; hero?: boolean }) {
  const [selected, setSelected] = useState(0); const [zoomed, setZoomed] = useState(false); const dialog = useRef<HTMLDialogElement>(null); const trigger = useRef<HTMLButtonElement>(null); const { t } = useLocale(); const g = t.gallery;
  const titleId = `zoom-title-${hero ? 'hero' : 'product'}`;
  return <div className={hero ? 'gallery hero-gallery' : 'gallery'}><button className="gallery-trigger" ref={trigger} disabled={!images.length} onClick={() => { setZoomed(false); dialog.current?.showModal(); }} aria-label={g.zoom(name)}><ProductImage key={images[selected]} src={images[selected]} alt={name} priority quality={90} sizes={hero ? '(max-width: 800px) 100vw, 58vw' : '(max-width: 800px) 100vw, 55vw'} /><span className="zoom-hint"><span aria-hidden="true">＋</span> {g.hint}</span></button>
    {images.length > 1 ? <div className="thumbnails">{images.map((src, i) => <button key={`${i}-${src}`} aria-label={g.view(i + 1)} aria-pressed={selected === i} onClick={() => setSelected(i)}><ProductImage src={src} alt="" sizes="80px" /></button>)}</div> : null}
    <dialog ref={dialog} className="zoom-dialog" aria-labelledby={titleId} onClose={() => { setZoomed(false); trigger.current?.focus(); }} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className="zoom-toolbar"><p id={titleId}>{name}</p><button onClick={() => setZoomed(!zoomed)}>{zoomed ? g.whole : g.enlarge}</button><button onClick={() => dialog.current?.close()} aria-label={g.closeLabel}>{g.close}</button></div><div className="zoom-scroll" tabIndex={0} aria-label={g.scroll}><div className={zoomed ? 'zoom-picture enlarged' : 'zoom-picture'}><ProductImage key={images[selected]} src={images[selected]} alt={g.detail(name)} quality={90} sizes="1600px" /></div></div><p className="zoom-caption">{images.length > 1 ? g.count(selected + 1, images.length) : g.single}</p>
    </dialog></div>;
}
