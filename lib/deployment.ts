// Read runtime configuration only; never derive the trusted origin from request headers.
export function appOrigin(env = process.env) {
  const url = new URL(env.APP_ORIGIN || env.RENDER_EXTERNAL_URL || 'http://127.0.0.1:3000');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_ORIGIN must contain only scheme and host');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) throw new Error('HTTPS required for non-loopback origin');
  return url.origin;
}
export function publicDemo(env = process.env) { return env.BOTA_PUBLIC_DEMO === '1'; }
// Search engines may index only the real shop: HTTPS origin and not the demo. Local runs and demos stay noindex.
// Temporary addresses like 203-0-113-5.sslip.io (used until the real domain works) are not indexed either.
export function indexable(env = process.env) {
  const origin = new URL(appOrigin(env));
  return !publicDemo(env) && origin.protocol === 'https:' && !/(^|\.)(sslip\.io|nip\.io)$/.test(origin.hostname);
}
