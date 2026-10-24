// The surgical scrubs import: dry run writes nothing, --apply creates products with processed photos and hides
// the category to hide, a second run changes nothing. Runs the real script on a temporary data folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';

test('import:scrubs creates products from photos, hides the old category and is safe to repeat', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'bota-import-')); const data = join(root, 'data'); const photos = join(root, 'photos');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  // The script's temporary snapshot goes here, so the test can check nothing is left behind.
  const scratchTmp = join(root, 'tmp'); mkdirSync(scratchTmp); const tmpEnv = { TMPDIR: scratchTmp, TMP: scratchTmp, TEMP: scratchTmp };
  mkdirSync(photos);
  for (const [file, color] of [['a-short.png', '#2a4d8f'], ['b-long.png', '#b8d8a0']]) {
    writeFileSync(join(photos, file), await sharp({ create: { width: 300, height: 400, channels: 3, background: color } }).png().toBuffer());
  }
  const manifest = join(root, 'manifest.json');
  writeFileSync(manifest, JSON.stringify({
    category: ['Хирургические костюмы', 'Surgical scrubs'], price: 1800000, sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'], hideCategory: 'Образы',
    models: { '004': ['Рубашка с {trim} отделкой.', 'Top with {trim} trim.'], '006': ['Рубашка с V-образным вырезом.', 'V-neck top.'] },
    items: [
      { file: 'a-short.png', id: 'scrubs-test-a', model: '004', sleeve: 'short', color: ['тёмно-синий', 'navy'], trim: ['голубой', 'light blue'] },
      { file: 'b-long.png', id: 'scrubs-test-b', model: '006', sleeve: 'long', color: ['фисташковый', 'pistachio'], trim: null },
    ],
  }));
  const run = (...extra) => spawnSync(process.execPath, ['--conditions=react-server', 'scripts/import-scrubs.mjs', photos, '--manifest', manifest, ...extra], { env: { ...process.env, ...tmpEnv, BOTA_DATA_DIR: data }, encoding: 'utf8' });
  const rows = () => { const d = new DatabaseSync(join(data, 'bota.sqlite')); try { return d.prepare('SELECT id, data FROM products ORDER BY rowid').all().map(r => JSON.parse(r.data)); } finally { d.close(); } };

  const fresh = run(); assert.equal(fresh.status, 0, fresh.stderr); assert.match(fresh.stdout, /Create: 2/);
  assert.ok(!existsSync(join(data, 'bota.sqlite')), 'Dry run on an empty folder creates no database');
  // A seeded database, then a dry run must leave it byte-for-byte unchanged.
  const seed = spawnSync(process.execPath, ['--conditions=react-server', '-e', "import('./lib/db.ts').then(m => m.db())"], { env: { ...process.env, BOTA_DATA_DIR: data }, encoding: 'utf8' });
  assert.equal(seed.status, 0, seed.stderr);
  const before = readFileSync(join(data, 'bota.sqlite')); const filesBefore = readdirSync(data).sort();
  const dry = run(); assert.equal(dry.status, 0, dry.stderr); assert.match(dry.stdout, /Create: 2, already exist: 0, hide "Образы": 3/); assert.match(dry.stdout, /Dry run/);
  assert.ok(readFileSync(join(data, 'bota.sqlite')).equals(before), 'Dry run writes nothing'); assert.deepEqual(readdirSync(data).sort(), filesBefore, 'No new files (-wal/-shm) either');
  assert.match(dry.stdout, /Photos checked: 2/);
  assert.deepEqual(readdirSync(scratchTmp), [], 'The temporary copy of the database is removed');
  assert.ok(!rows().some(p => p.id.startsWith('scrubs-')));

  const noDb = spawnSync(process.execPath, ['--conditions=react-server', 'scripts/import-scrubs.mjs', photos, '--manifest', manifest, '--apply'], { env: { ...process.env, BOTA_DATA_DIR: join(root, 'nowhere') }, encoding: 'utf8' });
  assert.equal(noDb.status, 1, 'No import into a folder without the shop database'); assert.ok(!existsSync(join(root, 'nowhere')));
  const applied = run('--apply'); assert.equal(applied.status, 0, applied.stderr); assert.match(applied.stdout, /Done: created 2, hidden 3/);
  const all = rows(); const scrubs = all.filter(p => p.id.startsWith('scrubs-'));
  assert.deepEqual(scrubs.map(p => p.id), ['scrubs-test-a', 'scrubs-test-b'], 'Manifest order is kept');
  assert.equal(scrubs[0].name, 'Хирургический костюм 004, тёмно-синий');
  assert.equal(scrubs[1].name, 'Хирургический костюм 006 с длинным рукавом, фисташковый');
  assert.equal(scrubs[1].nameEn, 'Surgical scrubs 006, long sleeve, pistachio');
  assert.match(scrubs[0].description, /с голубой отделкой/); assert.match(scrubs[0].description, /65% полиэстер, 35% хлопок/);
  assert.match(scrubs[0].description, /Пошив: фабрика-партнёр Songxin/); assert.match(scrubs[0].descriptionEn, /Sewn by our partner factory Songxin/); assert.match(scrubs[1].description, /Длинный рукав/);
  for (const p of scrubs) {
    assert.equal(p.price, 1800000); assert.equal(p.category, 'Хирургические костюмы'); assert.equal(p.categoryEn, 'Surgical scrubs');
    assert.deepEqual(p.sizes, ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']); assert.deepEqual(p.colors, []); assert.equal(p.active, true);
    assert.match(p.images[0], /^\/media\/[a-f0-9-]{36}\.webp$/);
  }
  assert.equal(readdirSync(join(data, 'uploads')).filter(f => f.endsWith('.webp')).length, 2);
  assert.ok(all.filter(p => p.category === 'Образы').every(p => !p.active), 'Old looks are hidden, not deleted');
  assert.equal(all.filter(p => p.category === 'Образы').length, 3);

  // A broken photo fails the dry run already.
  writeFileSync(join(photos, 'a-short.png'), 'not an image'); const broken = run();
  assert.equal(broken.status, 0, 'Existing products are skipped, so their photos are not read again');
  const fresh2 = spawnSync(process.execPath, ['--conditions=react-server', 'scripts/import-scrubs.mjs', photos, '--manifest', manifest], { env: { ...process.env, BOTA_DATA_DIR: join(root, 'empty') }, encoding: 'utf8' });
  assert.equal(fresh2.status, 1); assert.match(fresh2.stderr, /Photo cannot be used: .*a-short\.png/);
  const again = run('--apply'); assert.equal(again.status, 0, again.stderr); assert.match(again.stdout, /Done: created 0, hidden 0/);
  assert.equal(rows().length, all.length); assert.equal(readdirSync(join(data, 'uploads')).length, 2);
});
