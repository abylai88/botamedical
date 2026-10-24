import Link from 'next/link';
import { product, products } from '@/lib/db';
import { latestPublished } from '@/lib/comments';
import { getDictionary } from '@/lib/locale';
import { localized } from '@/lib/i18n';
import { getSiteContent, siteImage, siteTexts } from '@/lib/site';
import { ProductCard } from '@/components/product-card';
import { ProductImage } from '@/components/product-image';
import { SCRUBS_CATEGORY, categoryHref } from '@/lib/categories';

export default async function Home() {
  const { locale, t } = await getDictionary(); const h = t.home;
  const content = getSiteContent(); const text = siteTexts(locale, content); const photo = (key: Parameters<typeof siteImage>[0]) => siteImage(key, content);
  const catalog = products();
  const lineup = [photo('hero1'), photo('hero2'), photo('hero3')]; const heroBg = content.images.heroBg;
  const reviews = latestPublished(3).map(c => ({ ...c, product: product(c.productId) })).filter(c => c.product?.active);
  const date = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ru-RU', { dateStyle: 'long', timeZone: 'Europe/Moscow' });
  const tape = locale === 'en' ? ['Lab coats', 'Surgical scrubs', 'Team orders'] : ['Халаты', 'Хирургические костюмы', 'Заказы для команды'];
  return <>
    <section className={heroBg ? 'hero-team has-photo' : 'hero-team'} aria-labelledby="hero-title">
      <div className="hero-backdrop" aria-hidden="true">{heroBg ? <ProductImage src={heroBg} alt="" priority quality={90} sizes="100vw" /> : null}<span className="hero-wordmark" /></div>
      <div className="hero-team-copy">
        <p className="eyebrow">{text('home.kicker')}</p>
        <h1 id="hero-title">{text('home.title')}</h1>
        <p className="hero-lead">{text('home.lead')}</p>
        <div className="hero-ctas"><Link href="/catalog?category=Халаты" className="button">{text('home.shopCoats')}</Link><Link href={categoryHref(SCRUBS_CATEGORY)} className="button secondary">{text('home.shopLooks')}</Link></div>
      </div>
      <div className="hero-lineup" role="img" aria-label={h.lineupAlt}>
        {lineup.map((src, i) => <div key={i} className={`lineup-figure lineup-${i + 1}`}><ProductImage src={src} alt="" priority={i === 1} quality={90} sizes="(max-width: 760px) 70vw, 24vw" />{i === 1 ? <span className="hang-tag" aria-hidden="true"><span className="mark-camel" /><span>BOTA</span></span> : null}</div>)}
      </div>
    </section>

    <div className="brand-tape" aria-hidden="true"><div>{Array.from({ length: 6 }, (_, i) => <span key={i}><span className="mark-camel" />{tape[i % tape.length]}</span>)}</div></div>

    <section className="section category-tiles" aria-label={h.categories}>
      <Link href="/catalog?category=Халаты" className="category-tile tile-coat"><span className="tile-photo"><ProductImage src={photo('tileCoats')} alt="" quality={90} sizes="(max-width: 760px) 100vw, 50vw" /></span><span className="tile-copy"><strong>{text('home.coatsTile')}</strong><span>{text('home.coatsText')}</span><em>{h.categoryCta} <span aria-hidden="true">→</span></em></span></Link>
      <Link href={categoryHref(SCRUBS_CATEGORY)} className="category-tile tile-looks"><span className="tile-photo"><ProductImage src={photo('tileLooks')} alt="" quality={90} sizes="(max-width: 760px) 100vw, 50vw" /></span><span className="tile-copy"><strong>{text('home.looksTile')}</strong><span>{text('home.looksText')}</span><em>{h.categoryCta} <span aria-hidden="true">→</span></em></span></Link>
    </section>

    <section id="collection" className="section popular">
      <div className="section-heading"><h2>{text('home.popular')}</h2><Link className="text-link" href="/catalog">{h.all}</Link></div>
      {catalog.length ? <div className="product-grid popular-grid">{catalog.slice(0, 4).map(p => <ProductCard key={p.id} product={p} locale={locale} />)}</div> : <p className="empty">{h.empty}</p>}
    </section>

    <section className="team-band" aria-labelledby="team-title">
      <span className="team-camel" aria-hidden="true" />
      <div className="team-copy"><p className="eyebrow">{text('home.teamKicker')}</p><h2 id="team-title">{text('home.teamTitle')}</h2><p>{text('home.teamText')}</p><Link href="/catalog" className="button light">{text('home.teamCta')}</Link></div>
      <div className="team-ticket" aria-hidden="true">
        <p className="ticket-head"><span className="ticket-logo" /><span>№ 0124</span></p>
        {catalog.slice(0, 3).map((p, i) => <p key={p.id} className="ticket-line"><span>{localized(p, locale).name}</span><span>× {[12, 8, 6][i]}</span></p>)}
        <p className="ticket-foot"><span>{locale === 'en' ? 'Department order' : 'Заказ отделения'}</span><span className="ticket-pulse"><svg viewBox="0 0 120 24" preserveAspectRatio="none"><path d="M0 14 H44 L50 14 L54 5 L59 22 L64 2 L69 18 L73 14 H120" /></svg></span></p>
      </div>
    </section>

    {reviews.length ? <section className="section reviews" aria-labelledby="reviews-title">
      <div className="section-heading"><div><p className="eyebrow">{h.reviews}</p><h2 id="reviews-title">{text('home.reviewsLead')}</h2></div></div>
      <div className="review-grid">{reviews.map(r => <figure key={r.id} className="review"><blockquote>{r.body}</blockquote><figcaption><strong>{r.author}</strong>{r.staff ? <span className="comment-badge">BOTA</span> : null}<span><Link href={`/catalog/${r.productId}`}>{localized(r.product!, locale).name}</Link>, <time dateTime={r.createdAt}>{date.format(new Date(r.createdAt))}</time></span></figcaption></figure>)}</div>
    </section> : null}

    <section id="approach" className="editorial-brand">
      <div className="editorial-brand-image"><ProductImage src={photo('brand')} alt={h.brandAlt} quality={90} sizes="(max-width: 760px) 100vw, 55vw" /></div>
      <div className="editorial-brand-copy"><span className="brand-camel" aria-hidden="true" /><p className="eyebrow">{text('home.brandKicker')}</p><h2>{text('home.brandTitle')}</h2><p>{text('home.brandText')}</p><Link href="/about" className="text-link">{text('home.brandCta')}</Link></div>
    </section>
  </>;
}
