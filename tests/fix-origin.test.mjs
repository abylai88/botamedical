// fix:origin rewrites only the country sentence in product descriptions; the dry run writes nothing and a second run changes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

test('fix:origin replaces the old origin line and is safe to repeat', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'bota-origin-')); const data = join(root, 'data'); const scratch = join(root, 'tmp'); mkdirSync(scratch);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = { ...process.env, BOTA_DATA_DIR: data, TMPDIR: scratch, TMP: scratch, TEMP: scratch };
  const run = (...extra) => spawnSync(process.execPath, ['--conditions=react-server', 'scripts/fix-origin.mjs', ...extra], { env, encoding: 'utf8' });
  assert.equal(run().status, 1, 'No database: refuses instead of creating one');

  const seed = spawnSync(process.execPath, ['--conditions=react-server', '-e', "import('./lib/db.ts').then(m => m.db())"], { env, encoding: 'utf8' });
  assert.equal(seed.status, 0, seed.stderr);
  const file = join(data, 'bota.sqlite');
  const put = product => { const d = new DatabaseSync(file); try { d.prepare('INSERT INTO products(id,data) VALUES (?,?)').run(product.id, JSON.stringify(product)); } finally { d.close(); } };
  const base = { category: 'Хирургические костюмы', categoryEn: 'Surgical scrubs', price: 1800000, sizes: ['XS'], colors: [], images: ['/images/coat.webp'], active: true, revision: 2 };
  put({ id: 'scrubs-t1', name: 'Костюм', nameEn: 'Scrubs', ...base, description: 'Цвет: синий. Производство: Казахстан.\n\nДобавлено админом.', descriptionEn: 'Colour: blue. Made in Kazakhstan.' });
  put({ id: 'scrubs-t2', name: 'Костюм 2', ...base, description: 'Без страны.' });

  const before = readFileSync(file);
  const dry = run(); assert.equal(dry.status, 0, dry.stderr); assert.match(dry.stdout, /Fix origin line: 1/); assert.match(dry.stdout, /scrubs-t1/);
  assert.ok(readFileSync(file).equals(before), 'Dry run writes nothing'); assert.deepEqual(readdirSync(scratch), [], 'Temporary copy removed');

  const applied = run('--apply'); assert.equal(applied.status, 0, applied.stderr); assert.match(applied.stdout, /Done: fixed 1/);
  const rows = () => { const d = new DatabaseSync(file); try { return Object.fromEntries(d.prepare('SELECT id, data FROM products').all().map(r => [r.id, JSON.parse(r.data)])); } finally { d.close(); } };
  const after = rows();
  assert.equal(after['scrubs-t1'].description, 'Цвет: синий. Бренд BOTA (Казахстан). Пошив: фабрика-партнёр Songxin.\n\nДобавлено админом.');
  assert.equal(after['scrubs-t1'].descriptionEn, 'Colour: blue. BOTA brand (Kazakhstan). Sewn by our partner factory Songxin.');
  assert.equal(after['scrubs-t1'].revision, 3); assert.equal(after['scrubs-t1'].id, 'scrubs-t1');
  assert.equal(after['scrubs-t2'].description, 'Без страны.'); assert.equal(after['scrubs-t2'].revision, 2);

  const again = run('--apply'); assert.equal(again.status, 0, again.stderr); assert.match(again.stdout, /Done: fixed 0/);
  assert.equal(rows()['scrubs-t1'].revision, 3);
});
