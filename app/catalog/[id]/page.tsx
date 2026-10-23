import Link from 'next/link';
import { notFound } from 'next/navigation';
import { product } from '@/lib/db';
import { getDictionary } from '@/lib/locale';
import { localized } from '@/lib/i18n';
import { Gallery } from '@/components/gallery';
import { ProductPurchase } from '@/components/product-purchase';
import { ProductComments } from '@/components/product-comments';
import { productComments } from '@/lib/comments';
import { publicDemo } from '@/lib/deployment';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const { locale, t } = await getDictionary(); const p = product((await params).id); if (!p?.active) return { title: t.product.notFound };
  // Preview for links shared in WhatsApp/Instagram: name, first paragraph of the description and the main photo.
  const item = localized(p, locale); const description = item.description.split('\n')[0].slice(0, 200);
  return { title: item.name, description, openGraph: { title: item.name, description, images: p.images.slice(0, 1) } }; }
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const p = product((await params).id); if (!p || !p.active) notFound();
  const { locale, t } = await getDictionary(); const d = t.product; const { name, description, category } = localized(p, locale);
  return <div className="section product-page"><p className="breadcrumb"><Link href="/catalog">{t.catalog.title}</Link> / <Link href={`/catalog?category=${encodeURIComponent(p.category)}`}>{category}</Link> / {name}</p><div className="product-layout"><Gallery images={p.images} name={name} /><div className="product-details"><p className="eyebrow">{category}</p><h1>{name}</h1><ProductPurchase product={p} />{description ? <p className="description">{description}</p> : null}<details open><summary>{d.important}</summary><p>{d.importantText}</p></details><details><summary>{d.photos}</summary><p>{p.images.length > 1 ? d.photosMany : d.photosOne} {d.specs}</p></details><details><summary>{d.ordering}</summary><p>{d.orderingText}</p><Link href="/info" className="text-link">{d.more}</Link></details></div></div><ProductComments productId={p.id} comments={productComments(p.id)} enabled={!publicDemo()} /></div>;
}
