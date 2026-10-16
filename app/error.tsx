'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <div className="empty section" role="alert"><h1>Не удалось загрузить страницу</h1><p>Попробуйте ещё раз. Если ошибка повторится, проверьте локальный сервер.</p><button className="button" onClick={reset}>Повторить</button></div>; }
