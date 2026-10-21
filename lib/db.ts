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
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, request_hash TEXT NOT NULL, created TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS media (name TEXT PRIMARY KEY, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS comments (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, created TEXT NOT NULL, author TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', staff INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS comments_product ON comments(product_id, created);
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
export function orders(): Order[] {
  return (db().prepare('SELECT * FROM orders ORDER BY created DESC LIMIT 200').all() as { id: string; created: string; status: Order['status']; payload: string }[])
    .map(row => ({ ...decrypt(row.payload), id: row.id, createdAt: row.created, status: row.status }));
}
export function digest(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  db().prepare('DELETE FROM rate_limits WHERE expires < ?').run(now);
  const row = db().prepare(`INSERT INTO rate_limits(key,count,expires) VALUES (?,1,?)
    ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).get(digest(key), now + windowMs) as { count: number };
  return row.count <= limit;
}
