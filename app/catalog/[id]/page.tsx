import Link from 'next/link';
import { notFound } from 'next/navigation';
import { product } from '@/lib/db';
import { Gallery } from '@/components/gallery';
import { ProductPurchase } from '@/components/product-purchase';
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) { const p = product((await params).id); return { title: p?.active ? p.name : 'Товар не найден' }; }
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const p = product((await params).id); if (!p || !p.active) notFound();
  return <div className="section product-page"><p className="breadcrumb"><Link href="/catalog">Каталог</Link> / {p.name}</p><div className="product-layout"><Gallery images={p.images} name={p.name} /><div className="product-details"><p className="section-kicker">{p.category} / Демонстрационная модель</p><h1>{p.name}</h1><p className="description">{p.description || 'Описание пока не добавлено.'}</p><ProductPurchase product={p} /><details open><summary>Что важно знать</summary><p>Карточка создана для тестирования магазина. Цена условная, ассортимент не подтверждён. Добавление в корзину не резервирует товар.</p></details><details><summary>Фотографии и характеристики</summary><p>{p.images.length > 1 ? 'Выберите снимок под основным изображением.' : 'Доступен один снимок. Для полной презентации нужны отдельные фотографии спинки, посадки и ткани.'} Состав и таблица измерений пока не предоставлены.</p></details><details><summary>Оформление заказа</summary><p>Можно сохранить тестовый заказ на этом компьютере. Оплата, доставка и уведомления продавцу пока не подключены.</p><Link href="/info">Подробнее</Link></details></div></div></div>;
}
