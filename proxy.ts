import { NextRequest, NextResponse } from 'next/server';
import { appOrigin, publicDemo } from './lib/deployment';
export function proxy(request: NextRequest) {
  // Provider probes can use an internal Host; this endpoint returns no application data.
  if (request.nextUrl.pathname === '/healthz' && (request.method === 'GET' || request.method === 'HEAD')) return NextResponse.next();
  const expected = new URL(appOrigin());
  if (request.headers.get('host') !== expected.host) return new NextResponse('Invalid host', { status: 403 });
  const pathname = request.nextUrl.pathname;
  if (publicDemo() && (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/') || pathname.startsWith('/media/'))) {
    return new NextResponse('Недоступно в публичной демонстрации.', { status: 403, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV === 'development';
  // Inline styles are required by next/image. Script execution remains nonce-restricted.
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'${dev ? ' ws://127.0.0.1:*' : ''}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';${expected.protocol === 'https:' ? ' upgrade-insecure-requests;' : ''}`;
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|images|favicon.ico).*)'] };
