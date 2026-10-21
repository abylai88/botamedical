import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db.ts';
// Signed render time of the checkout form. A bot that posts faster than a person could
// fill the form, or without loading the page at all, is rejected quietly by the order route.
export const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 24 * 60 * 60_000;
function secret() {
  db().prepare('INSERT OR IGNORE INTO meta VALUES (?,?)').run('form-secret', randomBytes(32).toString('hex'));
  return (db().prepare('SELECT value FROM meta WHERE key=?').get('form-secret') as { value: string }).value;
}
const sign = (issued: number) => createHmac('sha256', secret()).update(`checkout:${issued}`).digest('hex');
export function issueFormToken(now = Date.now()) { return `${now}.${sign(now)}`; }
export function checkFormToken(token: string | undefined, now = Date.now()): 'ok' | 'invalid' | 'fast' | 'expired' {
  const match = /^(\d{13})\.([a-f0-9]{64})$/.exec(token || '');
  if (!match) return 'invalid';
  const issued = Number(match[1]), expected = Buffer.from(sign(issued), 'hex');
  if (!timingSafeEqual(expected, Buffer.from(match[2], 'hex'))) return 'invalid';
  if (now - issued < MIN_FILL_MS) return 'fast';
  return now - issued > MAX_AGE_MS ? 'expired' : 'ok';
}
