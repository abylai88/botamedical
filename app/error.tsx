'use client';
import { useLocale } from '@/components/locale-provider';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { const { t } = useLocale(); return <div className="empty section" role="alert"><h1>{t.error.title}</h1><p>{t.error.text}</p><button className="button" onClick={reset}>{t.error.retry}</button></div>; }
