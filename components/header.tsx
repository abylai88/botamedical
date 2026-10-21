'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './cart-provider';
import { LanguageSwitch, useLocale } from './locale-provider';
export function Header({ announce }: { publicDemo?: boolean; announce: string }) {
  const [open, setOpen] = useState(false); const { lines, ready } = useCart(); const pathname = usePathname(); const { t } = useLocale();
  const count = ready ? lines.reduce((n, l) => n + l.quantity, 0) : 0;
  const close = () => setOpen(false);
  return <><div className="announce"><Link href="/catalog">{announce}</Link></div><header className="site-header">
    <Link className="brand" href="/" aria-label={t.nav.home} onClick={close}><Image src="/brand/bota-wordmark.png" alt="BOTA" width={128} height={30} unoptimized priority /></Link>
    <nav aria-label={t.nav.main} className={open ? 'main-nav is-open' : 'main-nav'} id="main-nav">
      <Link href="/catalog" aria-current={pathname.startsWith('/catalog') ? 'page' : undefined} onClick={close}>{t.nav.catalog}</Link><Link href="/catalog?category=Халаты" onClick={close}>{t.nav.coats}</Link><Link href="/catalog?category=Образы" onClick={close}>{t.nav.looks}</Link><Link href="/#approach" onClick={close}>{t.nav.about}</Link><Link href="/info" aria-current={pathname === '/info' ? 'page' : undefined} onClick={close}>{t.nav.info}</Link>
      <div className="nav-lang"><LanguageSwitch /></div>
    </nav><div className="header-actions"><div className="header-lang"><LanguageSwitch /></div><Link href="/cart" className="cart-link" aria-label={t.nav.cart(count)} onClick={close}><svg width="20" height="22" viewBox="0 0 20 22" fill="none" aria-hidden="true"><path d="M3 7h14l1 13H2L3 7Z" stroke="currentColor" strokeWidth="1.5"/><path d="M6 8V5a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5"/></svg>{count ? <span className="cart-count">{count}</span> : null}</Link><button className="menu-toggle" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}><span aria-hidden="true" className="burger" />{open ? t.nav.close : t.nav.menu}</button></div>
  </header></>;
}
