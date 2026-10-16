import { publicDemo } from '@/lib/deployment';
import Link from 'next/link';
import Image from 'next/image';
import { products } from '@/lib/db';
import { Gallery } from '@/components/gallery';
import { ProductCard } from '@/components/product-card';
export default function Home() {
  const catalog = products();
  const looks = catalog.filter(p => p.id !== 'bota-coat');
  const preview = (looks.length ? looks : catalog).slice(0, 3);
  return <><section className="hero"><div className="hero-copy"><p className="hero-intro">BOTA Group / Медицинская одежда</p><h1>Форма вашей<br/>профессии.</h1><p className="hero-description">Чистые линии. Сдержанный образ.<br/>В центре внимания — вы.</p><Link href="/catalog" className="button">Открыть каталог <span aria-hidden="true">↗</span></Link><div className="hero-footnote"><span className="line-mark" aria-hidden="true"/><p>Рассмотрите халат в деталях.<br/>Нажмите на фотографию, чтобы увеличить.</p></div></div><Gallery hero images={['/images/coat.webp']} name="Халат BOTA" /></section>
    <section className="section catalog-preview"><div className="section-heading"><div><p className="section-kicker">Знакомство с коллекцией</p><h2>Ваша следующая форма</h2></div><Link className="text-link" href="/catalog">Весь каталог <span aria-hidden="true">↗</span></Link></div><p className="demo-note">Карточки созданы для знакомства с магазином. Названия и цены — демонстрационные.</p><div className="product-grid">{preview.map(p => <ProductCard key={p.id} product={p} />)}</div>{!catalog.length ? <p className="empty">Каталог готовится. Загляните позже.</p> : null}</section>
    <section id="approach" className="brand-story"><div className="story-photo"><Image src="/images/look-01.webp" alt="Медицинские халаты на моделях — предоставленное изображение BOTA" fill sizes="(max-width: 800px) 100vw, 50vw" /></div><div className="story-copy"><p className="section-kicker">BOTA Group</p><h2>Профессия.<br/>Личность.<br/>Ваш образ.</h2><p>Медицинская одежда — часть того, как вас видят каждый день. Мы начинаем знакомство с BOTA с простого: силуэтов, деталей и фотографий.</p><p className="small">Состав тканей, размерные сетки и условия заказа появятся после подтверждения данных брендом.</p><Link href="/catalog" className="text-link">Рассмотреть модели</Link></div></section>
    <section className="section order-story"><div><p className="section-kicker">От выбора к заказу</p><h2>Попробуйте магазин<br/>в действии</h2></div><ol className="order-steps"><li><span>01</span><div><h3>Выберите модель</h3><p>Откройте карточку и рассмотрите фотографию крупнее.</p></div></li><li><span>02</span><div><h3>Соберите корзину</h3><p>Измените количество и проверьте итоговую сумму.</p></div></li><li><span>03</span><div><h3>{publicDemo() ? "Оцените свой выбор" : "Сохраните тестовый заказ"}</h3><p>{publicDemo() ? "В публичной демонстрации можно собрать корзину. Заказы и оплата пока недоступны." : "Заказ появится в локальной панели управления. Оплата не списывается."}</p></div></li></ol></section>
  </>;
}
