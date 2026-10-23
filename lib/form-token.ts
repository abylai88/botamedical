import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, digest } from './db.ts';
import { PRIVACY_VERSION } from './i18n.ts';
// Signed render time, a random id and the privacy policy edition shown on one checkout form
// ("<ms>.<id>.<YYYYMMDD>.<hmac>"). Missing or forged
// tokens mark an order as spam; a submit faster than a person could fill the form is asked to retry.
// The id keeps two forms rendered in the same millisecond apart.
export const MIN_FILL_MS = 3000;
const MAX_AGE_MS = 24 * 60 * 60_000;
const TOKEN = /^(\d{13})\.([a-f0-9]{32})\.(\d{8})\.([a-f0-9]{64})$/;
// Pages rendered by the previous release carry "<ms>.<id>.<hmac>": a real customer, asked to reload, not spam.
const LEGACY = /^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/;
// The policy edition the customer saw; an order is accepted only under the edition that is current.
const policy = (version = PRIVACY_VERSION) => version.replaceAll('-', '');
function secret() {
  db().prepare('INSERT OR IGNORE INTO meta VALUES (?,?)').run('form-secret', randomBytes(32).toString('hex'));
  return (db().prepare('SELECT value FROM meta WHERE key=?').get('form-secret') as { value: string }).value;
}
const sign = (issued: number, id: string, edition: string) => createHmac('sha256', secret()).update(`checkout:${issued}:${id}:${edition}`).digest('hex');
export function issueFormToken(now = Date.now(), edition = policy()) {
  const id = randomBytes(16).toString('hex');
  return `${now}.${id}.${edition}.${sign(now, id, edition)}`;
}
export function checkFormToken(token: string | undefined, now = Date.now()): 'ok' | 'invalid' | 'fast' | 'expired' {
  const match = TOKEN.exec(token || '');
  if (!match) return LEGACY.test(token || '') ? 'expired' : 'invalid';
  const issued = Number(match[1]), expected = Buffer.from(sign(issued, match[2], match[3]), 'hex');
  if (!timingSafeEqual(expected, Buffer.from(match[4], 'hex'))) return 'invalid';
  // The policy changed after the form was shown: the customer reloads and accepts the current edition.
  if (match[3] !== policy()) return 'expired';
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
