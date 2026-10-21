import 'server-only';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import type { Product, Order } from './types.ts';

// Runtime data is deliberately excluded from build tracing and deployment bundles.
export const dataDir = resolve(/* turbopackIgnore: true */ process.env.BOTA_DATA_DIR || '.local');
let connection: DatabaseSync | undefined;
export function db() {
  if (connection) return connection;
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const database = new DatabaseSync(join(dataDir, 'bota.sqlite'));
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES admins(username), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS used_form_tokens (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_delays (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, next_at INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, request_hash TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS media (name TEXT PRIMARY KEY, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, created TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', staff INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS comments_product ON comments(product_id, created);
    CREATE INDEX IF NOT EXISTS orders_created ON orders(created);
    CREATE INDEX IF NOT EXISTS orders_status ON orders(status, created);
  `);
  connection = database;
  if (!database.prepare('SELECT value FROM meta WHERE key=?').get('seed-v1')) {
    const names = ['Халат BOTA', 'Образ с тёмным комплектом', 'Образ с цветным комплектом', 'Образ с синим комплектом'];
    const images = ['coat', 'look-01', 'look-02', 'look-03'];
    database.exec('BEGIN IMMEDIATE');
    try {
      names.forEach((name, i) => {
        const product: Product = {
          id: i === 0 ? 'bota-coat' : `look-0${i}`, name, category: i === 0 ? 'Халаты' : 'Образы',
          description: i === 0 ? 'Белый халат на исходной фотографии BOTA. Состав, размерная сетка и условия поставки пока не подтверждены.' : 'Демонстрационная карточка на основе предоставленного снимка. Фото показывает образ целиком; состав комплекта и характеристики необходимо уточнить перед продажей.',
          price: [290000, 480000, 520000, 510000][i], sizes: [], colors: [], images: [`/images/${images[i]}.webp`], active: true, revision: 1,
        };
        database.prepare('INSERT INTO products(id,data) VALUES (?,?)').run(product.id, JSON.stringify(product));
      });
      database.prepare('INSERT INTO meta VALUES (?,?)').run('seed-v1', '1');
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
  }
  if (!database.prepare('SELECT value FROM meta WHERE key=?').get('seed-v2-en')) {
    // Adds English copy to the original seed cards and drops the old "demo" wording; owner edits are kept.
    const oldLook = 'Демонстрационная карточка на основе предоставленного снимка. Фото показывает образ целиком; состав комплекта и характеристики необходимо уточнить перед продажей.';
    const english: Record<string, Pick<Product, 'nameEn' | 'categoryEn' | 'descriptionEn'>> = {
      'bota-coat': { nameEn: 'BOTA White Lab Coat', categoryEn: 'Lab coats', descriptionEn: 'White BOTA lab coat. Fabric composition, size chart and delivery terms will be added soon.' },
      'look-01': { nameEn: 'Look with navy set', categoryEn: 'Looks', descriptionEn: 'A complete look: white lab coat over a navy set. Set composition and details will be added soon.' },
      'look-02': { nameEn: 'Look with colour set', categoryEn: 'Looks', descriptionEn: 'A complete look: white lab coat over a coloured set. Set composition and details will be added soon.' },
      'look-03': { nameEn: 'Look with blue set', categoryEn: 'Looks', descriptionEn: 'A complete look: white lab coat over a blue set. Set composition and details will be added soon.' },
    };
    database.exec('BEGIN IMMEDIATE');
    try {
      for (const [id, en] of Object.entries(english)) {
        const row = database.prepare('SELECT data FROM products WHERE id=?').get(id) as { data: string } | undefined;
        if (!row) continue;
        const item = JSON.parse(row.data) as Product;
        const next: Product = { ...item, nameEn: item.nameEn || en.nameEn, categoryEn: item.categoryEn || en.categoryEn, descriptionEn: item.descriptionEn || en.descriptionEn };
        if (next.description === oldLook) next.description = 'Образ на основе снимка коллекции: белый халат и комплект. Состав комплекта и характеристики будут добавлены.';
        database.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify({ ...next, revision: item.revision + 1 }), id);
      }
      database.prepare('INSERT INTO meta VALUES (?,?)').run('seed-v2-en', '1');
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
  }
  return database;
}
export function products(includeInactive = false): Product[] {
  return (db().prepare('SELECT data FROM products ORDER BY rowid').all() as { data: string }[])
    .map(row => JSON.parse(row.data) as Product).filter(p => includeInactive || p.active);
}
export function product(id: string): Product | undefined {
  const row = db().prepare('SELECT data FROM products WHERE id=?').get(id) as { data: string } | undefined;
  return row ? JSON.parse(row.data) : undefined;
}
function encryptionKey() {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const file = join(dataDir, 'order-key');
  if (!existsSync(file)) {
    if ((db().prepare('SELECT count(*) AS count FROM orders').get() as { count: number }).count > 0) throw new Error('Order key missing: restore the original key from a protected backup');
    // Exclusive creation handles two workers starting together. Never replace an existing key.
    try { writeFileSync(file, randomBytes(32), { flag: 'wx', mode: 0o600 }); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
  }
  const key = readFileSync(file);
  if (key.length !== 32) throw new Error('Invalid local encryption key');
  return key;
}
export function encrypt(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}
function decrypt(value: string) {
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
}
type OrderRow = { id: string; created: string; status: Order['status']; payload: string };
const readOrder = (row: OrderRow): Order => ({ ...decrypt(row.payload), id: row.id, createdAt: row.created, status: row.status });
export function orders(): Order[] {
  return (db().prepare('SELECT * FROM orders ORDER BY created DESC LIMIT 200').all() as OrderRow[]).map(readOrder);
}
export const ORDERS_PER_PAGE = 20;
export type OrderView = 'all' | 'new' | 'spam';
// 'all' hides quarantined spam, 'new' lists every unprocessed order regardless of age, 'spam' is the quarantine.
const VIEW_WHERE: Record<OrderView, string> = { all: "WHERE status!='spam'", new: "WHERE status='new'", spam: "WHERE status='spam'" };
export const SPAM_KEEP_DAYS = 30;
export function purgeOldSpam() {
  db().prepare("DELETE FROM orders WHERE status='spam' AND created < ?").run(new Date(Date.now() - SPAM_KEEP_DAYS * 86_400_000).toISOString());
}
// Pages are anchored to an order ("<created>~<id>") instead of an offset, so orders that arrive
// or change status between page loads never cause repeats or gaps.
const CURSOR = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z)~([0-9a-f-]{36})$/;
const OLDER = '(created < ?1 OR (created = ?1 AND id < ?2))', NEWER = '(created > ?1 OR (created = ?1 AND id > ?2))';
const cursorOf = (row: OrderRow) => `${row.created}~${row.id}`;
// One page of orders, newest first: the first page, the page older than `after`, or newer than `before`.
export function orderPage(view: OrderView, nav: { after?: string; before?: string } = {}) {
  const where = VIEW_WHERE[view], limit = ORDERS_PER_PAGE;
  const total = (db().prepare(`SELECT count(*) AS n FROM orders ${where}`).get() as { n: number }).n;
  const edge = (cursor?: string) => { const m = CURSOR.exec(cursor || ''); return m ? [m[1], m[2]] : null; };
  const after = edge(nav.after), before = edge(nav.before);
  let rows: OrderRow[] = [];
  if (before) {
    rows = (db().prepare(`SELECT * FROM orders ${where} AND ${NEWER} ORDER BY created, id LIMIT ?3`).all(...before, limit) as OrderRow[]).reverse();
    if (rows.length < limit) rows = []; // Near the top: show the first page instead of a short one.
  } else if (after) {
    rows = db().prepare(`SELECT * FROM orders ${where} AND ${OLDER} ORDER BY created DESC, id DESC LIMIT ?3`).all(...after, limit) as OrderRow[];
  }
  if (!rows.length) rows = db().prepare(`SELECT * FROM orders ${where} ORDER BY created DESC, id DESC LIMIT ?`).all(limit) as OrderRow[];
  const exists = (side: string, row?: OrderRow) => !!row && !!db().prepare(`SELECT 1 FROM orders ${where} AND ${side} LIMIT 1`).get(row.created, row.id);
  const first = rows[0], last = rows.at(-1);
  return { view, orders: rows.map(readOrder), total, newer: exists(NEWER, first) ? cursorOf(first!) : null, older: exists(OLDER, last) ? cursorOf(last!) : null };
}
// node:sqlite rows have a null prototype; copy into a plain object so it can go to a Client Component.
export function orderCounts() {
  const row = db().prepare("SELECT count(*) FILTER (WHERE status!='spam') AS total, count(*) FILTER (WHERE status='new') AS unprocessed, count(*) FILTER (WHERE status='spam') AS spam FROM orders").get() as { total: number; unprocessed: number; spam: number };
  return { total: row.total, unprocessed: row.unprocessed, spam: row.spam };
}
export function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  db().prepare('DELETE FROM rate_limits WHERE expires < ?').run(now);
  const row = db().prepare(`INSERT INTO rate_limits(key,count,expires) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).get(digest(key), now + windowMs) as { count: number };
  return row.count <= limit;
}
// Progressive delay for one key (a login from one address): the first LOGIN_FREE_FAILURES
// attempts are free, then each next one waits twice as long, up to 15 minutes. The attempt
// is reserved before the password check so parallel requests cannot slip through;
// a successful login removes the key. Returns seconds to wait, or 0 when the attempt may run.
const LOGIN_FREE_FAILURES = 5;
export function reserveLoginAttempt(key: string) {
  const now = Date.now(), hash = digest(key);
  db().prepare('DELETE FROM login_delays WHERE expires < ?').run(now);
  const row = db().prepare(`INSERT INTO login_delays(key,failures,next_at,expires) VALUES (?,1,?,?)
    ON CONFLICT(key) DO UPDATE SET failures=failures+1,
      next_at=?2 + CASE WHEN failures+1 < ${LOGIN_FREE_FAILURES} THEN 0 ELSE min(900000, 5000 * (1 << min(failures+1-${LOGIN_FREE_FAILURES}, 10))) END,
      expires=?3
    WHERE next_at <= ?2 RETURNING failures`).get(hash, now, now + 60 * 60_000) as { failures: number } | undefined;
  if (row) return 0;
  const waiting = db().prepare('SELECT next_at FROM login_delays WHERE key=?').get(hash) as { next_at: number } | undefined;
  return Math.max(1, Math.ceil(((waiting?.next_at ?? now) - now) / 1000));
}
export function clearLoginAttempts(key: string) { db().prepare('DELETE FROM login_delays WHERE key=?').run(digest(key)); }
