'use client';
import Image from 'next/image';
import { useState } from 'react';
export function ProductImage({ src, alt, priority = false, sizes = '(max-width: 700px) 100vw, 33vw', className = '' }: { src?: string; alt: string; priority?: boolean; sizes?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className={`image-placeholder ${className}`} role="img" aria-label={`Нет фотографии: ${alt}`}><span>BOTA</span><small>Фотография появится позже</small></div>;
  return <Image className={className} src={src} alt={alt} fill sizes={sizes} priority={priority} onError={() => setFailed(true)} unoptimized={src.startsWith('/media/')} />;
}
