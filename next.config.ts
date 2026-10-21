import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['sharp'],
  outputFileTracingExcludes: { '*': ['./.local/**', './tests/**', './test-results/**', './docs/**', './.agents/**', './catalog/**', './hero-coat/**', './logo.jpg/**'] },
  images: { qualities: [75, 90], remotePatterns: [], localPatterns: [{ pathname: '/images/**' }, { pathname: '/media/**' }] },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
};
export default config;
