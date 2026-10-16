import Link from 'next/link';
export default function NotFound() { return <div className="empty section"><p className="section-kicker">404</p><h1>Страница не найдена</h1><p>Возможно, товар был удалён или адрес изменился.</p><Link className="button" href="/catalog">Открыть каталог</Link></div>; }
