import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { COOKIE, session } from '@/lib/auth';
import { CartProvider } from '@/components/cart-provider';
import { Header } from '@/components/header';
import { LocaleProvider } from '@/components/locale-provider';
import { appOrigin, indexable, publicDemo } from '@/lib/deployment';
import { getDictionary } from '@/lib/locale';
import { siteTexts } from '@/lib/site';
import { SCRUBS_CATEGORY, categoryHref } from '@/lib/categories';
import './globals.css';
import './editorial.css';
export const dynamic = 'force-dynamic';
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  const index = indexable();
  return {
    metadataBase: new URL(appOrigin()), title: { default: t.meta.title, template: '%s — BOTA' }, description: t.meta.description,
    robots: { index, follow: index },
    // Link previews in WhatsApp, Instagram and Telegram.
    openGraph: { type: 'website', siteName: 'BOTA Medical Uniform', title: t.meta.title, description: t.meta.description, images: ['/images/coat.webp'] },
  };
}
export default async function Layout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDictionary(); const demo = publicDemo(); const text = siteTexts(locale);
  // Shortcut for the signed-in owner; visitors never see it.
  const admin = !demo && session((await cookies()).get(COOKIE)?.value);
  return <html lang={locale}><body><LocaleProvider locale={locale}><CartProvider><a className="skip-link" href="#main">{locale === 'en' ? 'Skip to content' : 'Перейти к содержимому'}</a>{admin ? <div className="admin-bar" lang="ru"><span>Вы вошли как администратор</span><Link href="/admin?tab=site">Изменить фото и тексты главной</Link><Link href="/admin">Товары и цены</Link></div> : null}<Header publicDemo={demo} announce={demo ? t.announceDemo : text('announce')} /><main id="main">{children}</main>
    <footer className="site-footer">
      <div className="footer-brand"><Link href="/" aria-label={t.nav.home} className="footer-logo"><span className="wordmark" /></Link><p>{text('footer.tagline')}</p></div>
      <nav aria-label={t.footer.nav}><p className="footer-heading">{t.nav.catalog}</p><Link href="/catalog">{t.nav.catalog}</Link><Link href="/catalog?category=Халаты">{t.nav.coats}</Link><Link href={categoryHref(SCRUBS_CATEGORY)}>{t.nav.looks}</Link></nav>
      <nav aria-label={t.footer.contactsTitle}><p className="footer-heading">{t.footer.contactsTitle}</p><Link href="/about">{t.nav.about}</Link><Link href="/info">{t.nav.info}</Link><Link href="/privacy">{t.footer.privacy}</Link>{!demo ? <Link href="/admin">{t.footer.admin}</Link> : null}</nav>
      <section className="footer-info" aria-labelledby="footer-info-title"><p className="footer-heading" id="footer-info-title">{text('footer.infoTitle')}</p><p className="footer-info-text">{text('footer.infoText')}</p></section>
      <p className="footer-note">{text('footer.note')}</p>
      <p className="footer-copy">© {new Date().getFullYear()} BOTA</p>
      <span className="footer-wordmark" aria-hidden="true" />
    </footer>
  </CartProvider></LocaleProvider></body></html>;
}
