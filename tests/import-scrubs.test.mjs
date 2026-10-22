// The surgical scrubs import: dry run writes nothing, --apply creates products with processed photos and hides
// the category to hide, a second run changes nothing. Runs the real script on a temporary data folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';

test('import:scrubs creates products from photos, hides the old category and is safe to repeat', async () => {
  const root = mkdtempSync(join(tmpdir(), 'bota-import-')); const data = join(root, 'data'); const photos = join(root, 'photos');
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
  const run = (...extra) => spawnSync(process.execPath, ['--conditions=react-server', 'scripts/import-scrubs.mjs', photos, '--manifest', manifest, ...extra], { env: { ...process.env, BOTA_DATA_DIR: data }, encoding: 'utf8' });
  const rows = () => { const d = new DatabaseSync(join(data, 'bota.sqlite')); try { return d.prepare('SELECT id, data FROM products ORDER BY rowid').all().map(r => JSON.parse(r.data)); } finally { d.close(); } };

  const dry = run(); assert.equal(dry.status, 0, dry.stderr); assert.match(dry.stdout, /Create: 2/); assert.match(dry.stdout, /Dry run/);
  assert.ok(!rows().some(p => p.id.startsWith('scrubs-')), 'Dry run writes nothing');

  const applied = run('--apply'); assert.equal(applied.status, 0, applied.stderr); assert.match(applied.stdout, /Done: created 2, hidden 3/);
  const all = rows(); const scrubs = all.filter(p => p.id.startsWith('scrubs-'));
  assert.deepEqual(scrubs.map(p => p.id), ['scrubs-test-a', 'scrubs-test-b'], 'Manifest order is kept');
  assert.equal(scrubs[0].name, 'Хирургический костюм 004, тёмно-синий');
  assert.equal(scrubs[1].name, 'Хирургический костюм 006 с длинным рукавом, фисташковый');
  assert.equal(scrubs[1].nameEn, 'Surgical scrubs 006, long sleeve, pistachio');
  assert.match(scrubs[0].description, /с голубой отделкой/); assert.match(scrubs[0].description, /65% полиэстер, 35% хлопок/);
  assert.match(scrubs[0].description, /Производство: Казахстан/); assert.match(scrubs[1].description, /Длинный рукав/);
  for (const p of scrubs) {
    assert.equal(p.price, 1800000); assert.equal(p.category, 'Хирургические костюмы'); assert.equal(p.categoryEn, 'Surgical scrubs');
    assert.deepEqual(p.sizes, ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']); assert.deepEqual(p.colors, []); assert.equal(p.active, true);
    assert.match(p.images[0], /^\/media\/[a-f0-9-]{36}\.webp$/);
  }
  assert.equal(readdirSync(join(data, 'uploads')).filter(f => f.endsWith('.webp')).length, 2);
  assert.ok(all.filter(p => p.category === 'Образы').every(p => !p.active), 'Old looks are hidden, not deleted');
  assert.equal(all.filter(p => p.category === 'Образы').length, 3);

  const again = run('--apply'); assert.equal(again.status, 0, again.stderr); assert.match(again.stdout, /Done: created 0, hidden 0/);
  assert.equal(rows().length, all.length); assert.equal(readdirSync(join(data, 'uploads')).length, 2);
});
