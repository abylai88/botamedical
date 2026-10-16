import 'server-only';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { db, digest } from './db.ts';
function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
  });
}
export const COOKIE = 'bota_admin';
export const SESSION_SECONDS = 8 * 60 * 60;
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt:${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded?: string) {
  const [, salt, hex] = (encoded || `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`).split(':');
  const key = await derive(password, salt);
  const expected = Buffer.from(hex, 'hex');
  return !!encoded && expected.length === key.length && timingSafeEqual(expected, key);
}
export function session(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = db().prepare('SELECT username FROM sessions WHERE hash=? AND expires>?').get(digest(token), Date.now()) as { username: string } | undefined;
  return row || null;
}
export function createSession(username: string) {
  const token = randomBytes(32).toString('hex');
  db().prepare('DELETE FROM sessions WHERE expires < ? OR username=?').run(Date.now(), username);
  db().prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), username, Date.now() + SESSION_SECONDS * 1000);
  return token;
}
