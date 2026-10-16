// Run via npm run admin:create. No web bootstrap route or default password.
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { db } from '../lib/db.ts';
import { hashPassword } from '../lib/auth.ts';
if (!process.stdin.isTTY) throw new Error('Use an interactive terminal to create the administrator.');
let muted = false;
const output = new Writable({ write(chunk, encoding, callback) { if (!muted) process.stdout.write(chunk, encoding); callback(); } });
const rl = createInterface({ input: process.stdin, output, terminal: true });
try {
  const username = (await rl.question('Administrator username (3–64 letters/numbers): ')).trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,64}$/.test(username)) throw new Error('Invalid username.');
  const exists = db().prepare('SELECT username FROM admins WHERE username=?').get(username);
  if (exists) {
    const answer = await rl.question('Reset this account password and revoke all its sessions? Type RESET: ');
    if (answer !== 'RESET') throw new Error('Cancelled.');
  }
  process.stdout.write('Password (at least 14 characters; hidden): '); muted = true;
  const password = await rl.question(''); muted = false; process.stdout.write('\n');
  process.stdout.write('Repeat password (hidden): '); muted = true;
  const confirmation = await rl.question(''); muted = false; process.stdout.write('\n');
  if (password.length < 14 || password.length > 128 || password !== confirmation) throw new Error('Passwords must match and contain 14–128 characters.');
  const hash = await hashPassword(password);
  db().exec('BEGIN IMMEDIATE');
  try {
    db().prepare('INSERT INTO admins VALUES (?,?) ON CONFLICT(username) DO UPDATE SET password=excluded.password').run(username, hash);
    db().prepare('DELETE FROM sessions WHERE username=?').run(username);
    db().exec('COMMIT');
  } catch (e) { db().exec('ROLLBACK'); throw e; }
  console.log('Administrator ready. Sign in at /admin. No password was saved in plaintext.');
} catch (error) { muted = false; console.error(error.message); process.exitCode = 1; }
finally { rl.close(); }
