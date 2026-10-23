// Run via npm run key:create. Creates the order encryption key once; never replaces an existing one.
// Without this key the site does not accept orders, and orders in the database or in backups cannot be read.
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const dataDir = resolve(process.env.BOTA_DATA_DIR || '.local');
const file = join(dataDir, 'order-key');
const fingerprint = () => createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase();
if (existsSync(file)) {
  console.log(`order-key already exists, left unchanged: ${file}\nSHA-256 fingerprint: ${fingerprint()}`);
} else {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  writeFileSync(file, randomBytes(32), { flag: 'wx', mode: 0o600 });
  console.log(`order-key created: ${file}\nSHA-256 fingerprint: ${fingerprint()}\nSave a copy now (USB drive + password manager): without it orders and backups cannot be read.`);
}
