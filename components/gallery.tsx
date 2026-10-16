'use client';
import { useRef, useState } from 'react';
import { ProductImage } from './product-image';
export function Gallery({ images, name, hero = false }: { images: string[]; name: string; hero?: boolean }) {
  const [selected, setSelected] = useState(0); const [zoomed, setZoomed] = useState(false); const dialog = useRef<HTMLDialogElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  return <div className={hero ? 'gallery hero-gallery' : 'gallery'}><button className="gallery-trigger" ref={trigger} disabled={!images.length} onClick={() => { setZoomed(false); dialog.current?.showModal(); }} aria-label={`Увеличить фотографию: ${name}`}><ProductImage key={images[selected]} src={images[selected]} alt={name} priority sizes={hero ? '(max-width: 800px) 100vw, 58vw' : '(max-width: 800px) 100vw, 55vw'} /><span className="zoom-hint"><span aria-hidden="true">＋</span> Рассмотреть ближе</span></button>
    {images.length > 1 ? <div className="thumbnails">{images.map((src, i) => <button key={src} aria-label={`Ракурс ${i + 1}`} aria-pressed={selected === i} onClick={() => setSelected(i)}><ProductImage src={src} alt="" sizes="80px" /></button>)}</div> : null}
    <dialog ref={dialog} className="zoom-dialog" aria-labelledby={`zoom-title-${hero ? 'hero' : 'product'}`} onClose={() => { setZoomed(false); trigger.current?.focus(); }} onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}>
      <div className="zoom-toolbar"><p id={`zoom-title-${hero ? 'hero' : 'product'}`}>{name}</p><button onClick={() => setZoomed(!zoomed)}>{zoomed ? 'Весь снимок' : 'Увеличить ×2'}</button><button onClick={() => dialog.current?.close()} aria-label="Закрыть увеличенное фото">Закрыть ×</button></div><div className="zoom-scroll" tabIndex={0} aria-label="Увеличенное фото: прокручивайте для просмотра деталей"><div className={zoomed ? 'zoom-picture enlarged' : 'zoom-picture'}><ProductImage key={images[selected]} src={images[selected]} alt={`${name}, подробный вид`} sizes="1600px" /></div></div><p className="zoom-caption">Показан исходный снимок. Дополнительные ракурсы пока не предоставлены.</p>
    </dialog></div>;
}
