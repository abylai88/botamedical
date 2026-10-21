'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useLocale } from './locale-provider';
export function ProductImage({ src, alt, priority = false, sizes = '(max-width: 700px) 100vw, 33vw', className = '', quality }: { src?: string; alt: string; priority?: boolean; sizes?: string; className?: string; quality?: number }) {
  const [failed, setFailed] = useState(false); const [portrait, setPortrait] = useState(false); const { t } = useLocale();
  if (!src || failed) return <div className={`image-placeholder ${className}`} role="img" aria-label={t.gallery.none(alt)}><span>BOTA</span><small>{t.gallery.soon}</small></div>;
  return <Image className={portrait ? `${className} is-portrait`.trim() : className} src={src} alt={alt} fill sizes={sizes} priority={priority} quality={quality} onLoad={e => setPortrait(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth * 1.1)} onError={() => setFailed(true)} unoptimized={src.startsWith('/media/')} />;
}
