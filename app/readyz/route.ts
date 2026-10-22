import { ready } from '@/lib/db';
// 200 only when the site can really take and read orders: database open, order-key loaded and working.
// /healthz only says the process is up. Neither reveals anything about the data.
export function GET() {
  let ok = false;
  try { ok = ready(); } catch { ok = false; }
  if (!ok) console.error('BOTA readyz: not ready (database, order-key or order decryption failed)');
  return Response.json({ status: ok ? 'ready' : 'not ready' }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
