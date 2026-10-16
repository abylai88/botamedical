'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './cart-provider';
export function Header({ publicDemo = false }: { publicDemo?: boolean }) {
  const [open, setOpen] = useState(false); const { lines, ready } = useCart(); const pathname = usePathname();
  return <><div className="preview-strip">{publicDemo ? 'Демонстрация BOTA Group · без приёма заказов' : 'Локальная демонстрационная версия'} <span>Цены и ассортимент требуют подтверждения</span></div><header className="site-header">
    <Link className="brand" href="/" aria-label="BOTA Group — главная" onClick={() => setOpen(false)}><Image src="/images/logo.webp" alt="BOTA" width={144} height={36} priority /><span>Group</span></Link>
    <nav aria-label="Главная навигация" className={open ? 'main-nav is-open' : 'main-nav'} id="main-nav">
      <Link href="/catalog" aria-current={pathname.startsWith('/catalog') ? 'page' : undefined} onClick={() => setOpen(false)}>Каталог</Link><Link href="/#approach" onClick={() => setOpen(false)}>О бренде</Link><Link href="/info" onClick={() => setOpen(false)}>Заказ и контакты</Link>
    </nav><div className="header-actions"><Link href="/cart" className="cart-link" aria-label={`Корзина, товаров: ${ready ? lines.reduce((n, l) => n + l.quantity, 0) : 0}`}><svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true"><path d="M3 7h14l1 13H2L3 7Z" stroke="currentColor" strokeWidth="1.4"/><path d="M6 8V5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.4"/></svg><span>{ready ? lines.reduce((n, l) => n + l.quantity, 0) : 0}</span></Link><button className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>{open ? 'Закрыть' : 'Меню'}</button></div>
  </header></>;
}
