import { isIP } from 'node:net';
// Rate-limit key for the visitor. Proxy headers are trusted only with TRUST_PROXY=1:
// without a proxy in front, anyone can send a fake X-Forwarded-For.
export const SHARED_CLIENT = 'shared';
export function clientIp(headers: Headers, env: Record<string, string | undefined> = process.env) {
  if (env.TRUST_PROXY !== '1') return SHARED_CLIENT;
  // The proxy appends the address it saw, so the last X-Forwarded-For entry is the one it vouches for.
  const forwarded = headers.get('x-forwarded-for')?.split(',').at(-1)?.trim();
  const candidate = forwarded || headers.get('x-real-ip')?.trim() || '';
  return isIP(candidate) ? candidate.toLowerCase() : SHARED_CLIENT;
}
