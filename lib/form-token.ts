import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, digest } from './db.ts';
// Signed render time of the checkout form. Missing or forged tokens mark an order as spam;
// a submit faster than a person could fill the form is asked to wait and retry.
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
// One token places one order. Used tokens are kept only until they would expire anyway.
export function formTokenUsed(token: string) {
  db().prepare('DELETE FROM used_form_tokens WHERE expires < ?').run(Date.now());
  return !!db().prepare('SELECT 1 FROM used_form_tokens WHERE hash=?').get(digest(token));
}
// Throws on a token that is already used, so call it inside the order transaction.
export function markFormTokenUsed(token: string) {
  db().prepare('INSERT INTO used_form_tokens VALUES (?,?)').run(digest(token), Number(token.split('.')[0]) + MAX_AGE_MS);
}
