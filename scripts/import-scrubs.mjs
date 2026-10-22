// Run via: npm run import:scrubs -- <photo folder> [--apply] [--manifest file.json]
// Creates the surgical scrubs from scripts/import/surgical-scrubs.json: one product per photo, in the
// manifest order (short sleeves first, then long; colours flow from one to the next). Photos are processed
// exactly like an upload in the admin panel (rotate, fit 2000x2400, WebP). Products of the category in
// "hideCategory" are hidden, not deleted. Without --apply nothing is written: it only checks and prints the plan.
// Safe to run again: products that already exist are skipped. BOTA_DATA_DIR selects the data folder.
// The dry run reads a temporary copy of the database (the data folder is not touched at all) and decodes every
// new photo, so broken files show up before anything is written.
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import sharp from 'sharp';
import { db, dataDir } from '../lib/db.ts';
import { productSchema } from '../lib/validation.ts';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const manifestAt = args.indexOf('--manifest');
const manifestFile = resolve(manifestAt >= 0 ? args[manifestAt + 1] : 'scripts/import/surgical-scrubs.json');
const folder = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--manifest');
if (!folder) { console.error('Usage: npm run import:scrubs -- <photo folder> [--apply]'); process.exit(1); }
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
// Files written as root would be unreadable for the site (user bota): photos would answer 404.
if (process.getuid?.() === 0) { console.error('Do not run as root. On the server: sudo -u bota env BOTA_DATA_DIR=/var/lib/bota/data npm run import:scrubs -- <folder>'); process.exit(1); }

const sleeveText = { short: ['Короткий рукав.', 'Short sleeves.'], long: ['Длинный рукав с манжетами на резинке.', 'Long sleeves with elastic cuffs.'] };
const fill = (template, trim) => template.replace('{trim}', trim || '');
function describe(item) {
  const [modelRu, modelEn] = manifest.models[item.model];
  const [colorRu, colorEn] = item.color; const [trimRu, trimEn] = item.trim || [];
  const sizes = `${manifest.sizes[0]}–${manifest.sizes.at(-1)}`;
  const ru = [
    `${fill(modelRu, trimRu)} Брюки на эластичном поясе. ${sleeveText[item.sleeve][0]}`,
    `Цвет: ${colorRu}. Ткань: 65% полиэстер, 35% хлопок. Производство: Казахстан.`,
    `Размеры: ${sizes}, все в наличии. Поможем подобрать размер по росту и весу — напишите нам в WhatsApp.`,
    'BOTA Medical Uniform — бренд медицинской одежды из Алматы. Одеваем врачей, медсестёр и студентов-медиков, работаем с клиниками и больницами. Можно заказать один костюм или комплект на всё отделение: размеры, количество и сроки согласуем с вами.',
  ].join('\n\n');
  const en = [
    `${fill(modelEn, trimEn)} Trousers with an elastic waistband. ${sleeveText[item.sleeve][1]}`,
    `Colour: ${colorEn}. Fabric: 65% polyester, 35% cotton. Made in Kazakhstan.`,
    `Sizes: ${sizes}, all in stock. We will help you choose a size by height and weight — message us on WhatsApp.`,
    'BOTA Medical Uniform is a medical apparel brand from Almaty. We dress doctors, nurses and medical students and work with clinics and hospitals. Order a single set or a whole department: sizes, quantities and timing are agreed with you.',
  ].join('\n\n');
  const long = item.sleeve === 'long';
  return {
    name: `Хирургический костюм ${item.model}${long ? ' с длинным рукавом' : ''}, ${colorRu}`,
    nameEn: `Surgical scrubs ${item.model}${long ? ', long sleeve' : ''}, ${colorEn}`,
    description: ru, descriptionEn: en,
  };
}

async function photo(file) {
  const pipeline = sharp(readFileSync(file), { limitInputPixels: 24_000_000, failOn: 'warning' });
  const meta = await pipeline.metadata();
  if (!['jpeg', 'png', 'webp'].includes(meta.format || '') || (meta.pages || 1) !== 1) throw new Error(`${file}: not a still JPG/PNG/WebP`);
  return pipeline.rotate().resize({ width: 2000, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
}

const dbFile = join(dataDir, 'bota.sqlite');
console.log(`Data folder: ${dataDir}`);
// The import goes into the shop's existing database; a missing one usually means the wrong folder or BOTA_DATA_DIR.
if (apply && !existsSync(dbFile)) { console.error(`No shop database in ${dataDir}. Start the site once, or set BOTA_DATA_DIR to the right folder.`); process.exit(1); }
// Dry run: a consistent snapshot of the database in a temporary folder; without a database everything is new.
// While the site runs (its -wal/-shm exist) the snapshot is taken with SQLite's backup API from a read-only
// connection, so a write or checkpoint during the copy cannot mix states. Without -wal no one has the database
// open, and a plain copy of the single file is consistent and creates nothing in the data folder.
let scratch;
async function readCopy() {
  scratch = mkdtempSync(join(tmpdir(), 'bota-import-dry-'));
  const copy = join(scratch, 'bota.sqlite');
  if (existsSync(dbFile + '-wal') && existsSync(dbFile + '-shm')) {
    const source = new DatabaseSync(dbFile, { readOnly: true });
    try { await backup(source, copy); } finally { source.close(); }
  } else copyFileSync(dbFile, copy);
  return new DatabaseSync(copy, { readOnly: true });
}
process.on('exit', () => { if (scratch) rmSync(scratch, { recursive: true, force: true }); });
const database = apply ? db() : existsSync(dbFile) ? await readCopy() : null;
if (!database) console.log(`No database yet in ${dataDir}: it is created on --apply.`);
const productRows = () => database ? database.prepare('SELECT data FROM products').all().map(r => JSON.parse(r.data)) : [];
const exists = id => Boolean(database?.prepare('SELECT 1 FROM products WHERE id=?').get(id));
const plan = manifest.items.map(item => ({ item, file: join(folder, item.file), skip: exists(item.id) }));
const missing = plan.filter(p => !p.skip && !existsSync(p.file));
if (missing.length) { console.error(`Missing photos:\n${missing.map(p => '  ' + p.file).join('\n')}`); process.exit(1); }
const toHide = productRows().filter(p => p.category === manifest.hideCategory && p.active);

const [category, categoryEn] = manifest.category;
const created = [];
for (const p of plan.filter(p => !p.skip)) {
  const product = { ...describe(p.item), category, categoryEn, price: manifest.price, sizes: manifest.sizes, colors: [], images: ['/media/00000000-0000-0000-0000-000000000000.webp'], active: true, revision: 1 };
  const check = productSchema.safeParse(product);
  if (!check.success) { console.error(`${p.item.id}: ${check.error.issues.map(i => i.message).join('; ')}`); process.exit(1); }
  created.push({ ...p, product });
}
console.log(`Create: ${created.length}, already exist: ${plan.length - created.length}, hide "${manifest.hideCategory}": ${toHide.length}`);
for (const c of created) console.log(`  + ${c.item.id}  ${c.product.name}`);
for (const p of toHide) console.log(`  - hide ${p.id}  ${p.name}`);
if (!apply) {
  // Decode every new photo now (nothing is saved), so a broken or unsupported file fails the check, not the import.
  for (const c of created) {
    try { await photo(c.file); } catch (error) { console.error(`Photo cannot be used: ${c.file}: ${error.message}`); process.exit(1); }
  }
  console.log(`Photos checked: ${created.length}. Dry run: nothing written. Add --apply to import.`); process.exit(0);
}

// Photos first (new files only), then one transaction for media rows and products; on failure the new files are removed.
const uploads = join(dataDir, 'uploads'); mkdirSync(uploads, { recursive: true, mode: 0o700 });
const written = [];
try {
  for (const c of created) {
    const name = `${randomUUID()}.webp`; const image = await photo(c.file);
    // Registered before writing: a partly written file is removed on failure too.
    written.push(name);
    writeFileSync(join(uploads, name), image, { flag: 'wx', mode: 0o600 });
    c.product.images = [`/media/${name}`]; c.media = name;
  }
  database.exec('BEGIN IMMEDIATE');
  try {
    const now = new Date().toISOString();
    for (const c of created) {
      database.prepare('INSERT INTO media VALUES (?,?)').run(c.media, now);
      database.prepare('INSERT INTO products(id,data) VALUES (?,?)').run(c.item.id, JSON.stringify({ id: c.item.id, ...c.product }));
    }
    // Hide what is in the category right now (read inside the transaction): products an admin added or edited
    // meanwhile are included and their edits kept — only active/revision change.
    const current = database.prepare('SELECT data FROM products').all().map(r => JSON.parse(r.data))
      .filter(p => p.category === manifest.hideCategory && p.active);
    for (const p of current) database.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify({ ...p, active: false, revision: p.revision + 1 }), p.id);
    toHide.length = 0; toHide.push(...current);
    database.exec('COMMIT');
  } catch (error) { database.exec('ROLLBACK'); throw error; }
} catch (error) {
  for (const name of written) rmSync(join(uploads, name), { force: true });
  console.error(`Import failed, nothing changed: ${error.message}`); process.exit(1);
}
console.log(`Done: created ${created.length}, hidden ${toHide.length}.`);
