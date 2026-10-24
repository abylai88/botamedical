import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getLocale } from '@/lib/locale';
import { ABOUT, ABOUT_LANGS, ABOUT_LANG_NAMES, ABOUT_PHOTOS, toAboutLang, type AboutPhoto } from '@/lib/about';
import { COATS_CATEGORY, SCRUBS_CATEGORY, categoryHref } from '@/lib/categories';
import { COMPANY } from '@/lib/company';
import { whatsappLink } from '@/lib/site';
import '../about.css';

type Props = { searchParams: Promise<{ lang?: string | string[] }> };
// Kazakh is chosen with ?lang=kk; without it the page follows the site language (RU/EN).
async function language(searchParams: Props['searchParams']) {
  const { lang } = await searchParams;
  return toAboutLang(Array.isArray(lang) ? lang[0] : lang, await getLocale());
}
const href = (lang: string) => `/about?lang=${lang}`;
const SEAM = 'M8 92 C 220 92, 300 24, 500 40 S 820 104, 992 52';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const c = ABOUT[await language(searchParams)];
  return {
    title: c.meta.title, description: c.meta.description,
    alternates: { canonical: '/about', languages: { kk: href('kk'), ru: href('ru'), en: href('en') } },
    openGraph: { title: `${c.meta.title} — BOTA`, description: c.meta.description, images: [ABOUT_PHOTOS.building.src] },
  };
}

function Photo({ name, alt, sizes, className, priority }: { name: AboutPhoto; alt: string; sizes: string; className?: string; priority?: boolean }) {
  const p = ABOUT_PHOTOS[name];
  return <Image src={p.src} alt={alt} width={p.width} height={p.height} sizes={sizes} className={className} priority={priority} />;
}

export default async function About({ searchParams }: Props) {
  const lang = await language(searchParams); const c = ABOUT[lang]; const wa = whatsappLink();
  return <div className="about" lang={lang}>
    <section className="about-hero" aria-labelledby="about-title">
      <nav className="about-langs" aria-label={c.switchLabel}>
        {ABOUT_LANGS.map(code => <Link key={code} href={href(code)} lang={code} hrefLang={code} aria-current={code === lang ? 'true' : undefined} scroll={false}>{ABOUT_LANG_NAMES[code]}</Link>)}
      </nav>
      <div className="about-hero-copy">
        <p className="about-kicker">{c.hero.kicker}</p>
        <h1 id="about-title">{c.hero.title}</h1>
        <p className="about-lead">{c.hero.lead}</p>
      </div>
      <figure className="about-hero-photo">
        <Photo name="sewingLine" alt={c.hero.photoAlt} sizes="(max-width: 860px) 90vw, 36vw" priority />
        <figcaption>{c.hero.photoCaption}</figcaption>
      </figure>
      <figure className="about-route" role="img" aria-label={c.hero.routeLabel}>
        <span className="route-end route-from" aria-hidden="true"><strong>{c.hero.from}</strong><span>{c.hero.fromNote}</span></span>
        {/* A seam stitched from Xiangcheng to Almaty: drawn once on load, static with reduced motion. */}
        <svg className="route-seam" viewBox="0 0 1000 120" aria-hidden="true" focusable="false">
          <defs><mask id="seam-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="120"><path className="seam-reveal" pathLength="1" d={SEAM} /></mask></defs>
          <path className="seam-base" d={SEAM} />
          <path className="seam-stitch" d={SEAM} mask="url(#seam-mask)" />
          <circle className="seam-knot" cx="8" cy="92" r="6" /><circle className="seam-knot seam-knot-end" cx="992" cy="52" r="6" />
        </svg>
        <span className="route-end route-to" aria-hidden="true"><span className="route-camel" /><strong>{c.hero.to}</strong><span>{c.hero.toNote}</span></span>
      </figure>
    </section>

    <section className="about-intro" aria-labelledby="intro-title">
      <h2 id="intro-title">{c.intro.title}</h2>
      <div>{c.intro.text.map((p, i) => <p key={i}>{p}</p>)}</div>
    </section>

    <section className="about-partner" aria-labelledby="partner-title">
      <div className="partner-copy">
        <h2 id="partner-title">{c.partner.title}</h2>
        <p>{c.partner.text}</p>
        <div className="partner-photos">
          <Photo name="building" alt={c.partner.buildingAlt} sizes="(max-width: 860px) 100vw, 560px" className="partner-main" />
          <Photo name="fabricRolls" alt={c.partner.rollsAlt} sizes="(max-width: 860px) 40vw, 280px" />
        </div>
      </div>
      <aside className="care-label" aria-labelledby="label-title">
        <p className="care-label-head" id="label-title">{c.label.title}</p>
        <dl>{c.label.rows.map(([value, name]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
        <p className="care-label-note">{c.label.note}</p>
      </aside>
    </section>

    <section className="about-story" aria-labelledby="story-title">
      <h2 id="story-title">{c.story.title}</h2>
      <ol className="seam-timeline">
        {c.story.items.map(([year, text]) => <li key={year}><span className="seam-year">{year}</span><p>{text}</p></li>)}
        <li className="seam-end"><span className="seam-year"><span className="route-camel" aria-hidden="true" />BOTA</span><p><strong>{c.story.endTitle}</strong>{c.story.endText}</p></li>
      </ol>
    </section>

    <section className="about-process" aria-labelledby="process-title">
      <div className="process-head"><h2 id="process-title">{c.process.title}</h2><p>{c.process.lead}</p></div>
      <ol className="process-steps">
        {c.process.steps.map(([title, text, photo], i) => <li key={title} className={photo ? 'has-photo' : undefined}>
          {photo ? <Photo name={photo} alt={c.process.alts[photo] || ''} sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" /> : null}
          <span className="step-number" aria-hidden="true">{i + 1}</span>
          <h3>{title}</h3><p>{text}</p>
        </li>)}
      </ol>
    </section>

    <section className="about-offer" aria-labelledby="offer-title">
      <h2 id="offer-title">{c.products.title}</h2>
      <div className="offer-columns">
        <div className="offer-now">
          <p className="offer-status">{c.products.now}</p>
          <Link href={categoryHref(COATS_CATEGORY)} className="offer-link"><strong>{c.products.coats[0]}</strong><span>{c.products.coats[1]}</span></Link>
          <Link href={categoryHref(SCRUBS_CATEGORY)} className="offer-link"><strong>{c.products.scrubs[0]}</strong><span>{c.products.scrubs[1]}</span></Link>
        </div>
        <div className="offer-later">
          <p className="offer-status">{c.products.later}</p>
          <ul>{c.products.request.map(item => <li key={item}>{item}</li>)}</ul>
          <p className="offer-note">{c.products.note}</p>
        </div>
      </div>
    </section>

    <section className="about-orgs" aria-labelledby="orgs-title">
      <div><h2 id="orgs-title">{c.orgs.title}</h2><p>{c.orgs.text}</p></div>
      <ol className="orgs-steps">{c.orgs.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </section>

    <section className="about-values" aria-labelledby="values-title">
      <div className="values-intro">
        <h2 id="values-title">{c.values.title}</h2>
        <figure className="values-quote"><blockquote>{c.values.quote}</blockquote><figcaption>{c.values.quoteNote}</figcaption></figure>
        <div className="quality-note"><h3>{c.quality.title}</h3><p>{c.quality.text}</p><p>{c.quality.iso}</p></div>
      </div>
      <dl className="values-list">{c.values.items.map(([name, text]) => <div key={name}><dt>{name}</dt><dd>{text}</dd></div>)}</dl>
    </section>

    <section className="about-events" aria-labelledby="events-title">
      <h2 id="events-title">{c.events.title}</h2>
      <ul>{c.events.items.map(([name, when, text]) => <li key={name}><h3>{name}</h3><p className="event-when">{when}</p><p>{text}</p></li>)}</ul>
    </section>

    <section className="about-contact" aria-labelledby="contact-title">
      <span className="contact-camel" aria-hidden="true" />
      <h2 id="contact-title">{c.contact.title}</h2>
      <p>{c.contact.text}</p>
      <div className="contact-actions">
        <Link href="/catalog" className="button light">{c.contact.catalog}</Link>
        {wa ? <a href={wa} className="button contact-wa" target="_blank" rel="noopener noreferrer">{c.contact.whatsapp}</a> : null}
      </div>
      <address><span>{COMPANY.whatsapp}</span><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a><span>{c.contact.address}</span></address>
    </section>
  </div>;
}
