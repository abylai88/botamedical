// Run via: npm run fix:origin [-- --apply]
// Replaces the old country line in product descriptions with the brand and partner-factory line:
//   «Производство: Казахстан.» → «Бренд BOTA (Казахстан). Пошив: фабрика-партнёр Songxin.»
//   «Made in Kazakhstan.»      → «BOTA brand (Kazakhstan). Sewn by our partner factory Songxin.»
// Only that sentence changes; everything an admin wrote around it is kept. Without --apply nothing is written:
// the plan is printed from a temporary copy of the database. Safe to run again: fixed products are skipped.
// BOTA_DATA_DIR selects the data folder (on the server: sudo -u bota env BOTA_DATA_DIR=/var/lib/bota/data ...).
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
import { db, dataDir } from '../lib/db.ts';
import { productSchema } from '../lib/validation.ts';

const ORIGIN_FIXES = [
  ['description', 'Производство: Казахстан.', 'Бренд BOTA (Казахстан). Пошив: фабрика-партнёр Songxin.'],
  ['descriptionEn', 'Made in Kazakhstan.', 'BOTA brand (Kazakhstan). Sewn by our partner factory Songxin.'],
];
const apply = process.argv.includes('--apply');
// Files written as root would be unreadable for the site (user bota).
if (process.getuid?.() === 0) { console.error('Do not run as root. On the server: sudo -u bota env BOTA_DATA_DIR=/var/lib/bota/data npm run fix:origin'); process.exit(1); }
const dbFile = join(dataDir, 'bota.sqlite');
console.log(`Data folder: ${dataDir}`);
if (!existsSync(dbFile)) { console.error(`No shop database in ${dataDir}. Set BOTA_DATA_DIR to the right folder.`); process.exit(1); }

// Dry run: a consistent snapshot in a temporary folder, the data folder is not touched (see import-scrubs.mjs).
let scratch, database;
if (apply) database = db();
else {
  scratch = mkdtempSync(join(tmpdir(), 'bota-origin-dry-')); const copy = join(scratch, 'bota.sqlite');
  if (existsSync(dbFile + '-wal') && existsSync(dbFile + '-shm')) {
    const source = new DatabaseSync(dbFile, { readOnly: true });
    try { await backup(source, copy); } finally { source.close(); }
  } else copyFileSync(dbFile, copy);
  database = new DatabaseSync(copy, { readOnly: true });
}
process.on('exit', () => {
  if (!scratch) return;
  try { database.close(); } catch {}
  try { rmSync(scratch, { recursive: true, force: true, maxRetries: 5 }); }
  catch { console.error(`Remove the temporary copy of the database by hand: ${scratch}`); process.exitCode = 1; }
});

function fixed(product) {
  const next = { ...product }; let changed = false;
  for (const [field, from, to] of ORIGIN_FIXES) {
    if (typeof next[field] === 'string' && next[field].includes(from)) { next[field] = next[field].replaceAll(from, to); changed = true; }
  }
  return changed ? next : null;
}
const plan = rows => rows.map(p => ({ p, next: fixed(p) })).filter(x => x.next);
const read = () => database.prepare('SELECT data FROM products').all().map(r => JSON.parse(r.data));

const planned = plan(read());
console.log(`Fix origin line: ${planned.length}`);
for (const { p } of planned) console.log(`  ~ ${p.id}  ${p.name}`);
if (!apply) { console.log('Dry run: nothing written. Add --apply to change.'); process.exit(0); }

database.exec('BEGIN IMMEDIATE');
let done = 0;
try {
  // Re-read inside the transaction, so an edit made in the admin meanwhile is kept.
  for (const { p, next } of plan(read())) {
    const { id, ...rest } = next; const product = { ...rest, revision: p.revision + 1 };
    const check = productSchema.safeParse(product);
    if (!check.success) throw new Error(`${id}: ${check.error.issues.map(i => i.message).join('; ')}`);
    database.prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify({ id, ...product }), id); done++;
  }
  database.exec('COMMIT');
} catch (error) {
  database.exec('ROLLBACK'); console.error(`Nothing changed: ${error.message}`); process.exit(1);
}
console.log(`Done: fixed ${done}.`);
