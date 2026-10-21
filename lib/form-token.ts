import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, digest } from './db.ts';
// Signed render time plus a random id of one checkout form ("<ms>.<id>.<hmac>"). Missing or forged
// tokens mark an order as spam; a submit faster than a person could fill the form is asked to retry.
// The id keeps two forms rendered in the same millisecond apart.
export const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 24 * 60 * 60_000;
const TOKEN = /^(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/;
function secret() {
  db().prepare('INSERT OR IGNORE INTO meta VALUES (?,?)').run('form-secret', randomBytes(32).toString('hex'));
  return (db().prepare('SELECT value FROM meta WHERE key=?').get('form-secret') as { value: string }).value;
}
const sign = (issued: number, id: string) => createHmac('sha256', secret()).update(`checkout:${issued}:${id}`).digest('hex');
export function issueFormToken(now = Date.now()) {
  const id = randomBytes(16).toString('hex');
  return `${now}.${id}.${sign(now, id)}`;
}
export function checkFormToken(token: string | undefined, now = Date.now()): 'ok' | 'invalid' | 'fast' | 'expired' {
  const match = TOKEN.exec(token || '');
  if (!match) return 'invalid';
  const issued = Number(match[1]), expected = Buffer.from(sign(issued, match[2]), 'hex');
  if (!timingSafeEqual(expected, Buffer.from(match[3], 'hex'))) return 'invalid';
  if (now - issued < MIN_FILL_MS) return 'fast';
  return now - issued > MAX_AGE_MS ? 'expired' : 'ok';
}
// One token places one order, tracked by its random id. Used ids are kept only until the token would expire anyway.
const usedKey = (token: string) => digest(token.split('.')[1]);
export function formTokenUsed(token: string) {
  db().prepare('DELETE FROM used_form_tokens WHERE expires < ?').run(Date.now());
  return !!db().prepare('SELECT 1 FROM used_form_tokens WHERE hash=?').get(usedKey(token));
}
// Throws on a token that is already used, so call it inside the order transaction.
export function markFormTokenUsed(token: string) {
  db().prepare('INSERT INTO used_form_tokens VALUES (?,?)').run(usedKey(token), Number(token.split('.')[0]) + MAX_AGE_MS);
}
