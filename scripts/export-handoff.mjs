// Local, allowlisted copy of the CURRENT working files. No network or Git writes.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.resolve(process.argv[2] || path.join(root, '.local/handoff/bota-source-20261020'));
const roots = ['app', 'components', 'lib', 'scripts', 'tests', 'public', 'catalog', 'hero-coat', 'logo.jpg', 'docs', '.agents'];
const files = ['AGENTS.md', 'CLAUDE.md', 'HANDOFF.md', 'README.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'proxy.ts', '.gitignore', '.gitattributes', '.npmrc', '.dockerignore', 'render.yaml'];
const model = 'models/bota-coat-20261016';
const modelRoots = ['reference', 'textures', 'review/fabric-v4', 'review/surface-v3', 'snapshots/before-camera-fix-20261017', 'snapshots/before-fabric-v4-20261017'];
const selected = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const forbidden = /(^|\/)(?:\.env[^/]*|\.git|\.local|node_modules|\.next|test-results|__pycache__)(\/|$)|\.(?:pem|key|p12|pfx|sqlite|db|pyc|log|zip|blend\d+|tsbuildinfo)$/i;
async function add(relative) {
  relative = relative.replaceAll('\\', '/');
  if (forbidden.test(relative)) return;
  const stat = await fs.lstat(path.join(root, relative));
  if (stat.isSymbolicLink()) throw new Error(`Symlink needs manual review: ${relative}`);
  if (stat.isDirectory()) {
    for (const name of (await fs.readdir(path.join(root, relative))).sort()) await add(`${relative}/${name}`);
  } else if (stat.isFile()) selected.push(relative);
}
for (const relative of [...roots, ...files, ...modelRoots.map(p => `${model}/${p}`)]) await add(relative);
for (const entry of await fs.readdir(path.join(root, model), { withFileTypes: true })) {
  if (entry.isFile() && /\.(?:py|json|md|png|blend|glb)$/i.test(entry.name)) await add(`${model}/${entry.name}`);
}
const unique = [...new Set(selected)].sort();
if (unique.some(p => destination === path.join(root, p) || path.join(root, p).startsWith(destination + path.sep))) throw new Error('Destination overlaps source files');
// Review before copying; never print matching secret contents.
for (const relative of unique) {
  if (!/\.(?:md|json|mjs|ts|tsx|css|py|yaml|txt)$/i.test(relative)) continue;
  const text = await fs.readFile(path.join(root, relative), 'utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}|\bAKIA[A-Z0-9]{16}\b/.test(text)) throw new Error(`Potential credential requires review: ${relative}`);
}
await fs.mkdir(path.dirname(destination), { recursive: true });
await fs.mkdir(destination); // EEXIST is intentional: no overwrite of prior deliveries.
const manifest = [];
for (const relative of unique) {
  const original = await fs.readFile(path.join(root, relative));
  const target = path.join(destination, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, original, { flag: 'wx' });
  const sha256 = hash(original);
  if (hash(await fs.readFile(target)) !== sha256) throw new Error(`Copy verification failed: ${relative}`);
  manifest.push({ path: relative, bytes: original.length, sha256 });
}
await fs.writeFile(path.join(destination, 'TRANSFER-MANIFEST.json'), JSON.stringify({
  schema: 1, date: '2026-10-20', source: 'BOTA Group current working files, not Git HEAD',
  exclusions: 'Private state, env, Git metadata, dependencies, caches, logs, duplicate archives, blend1 and older heavy review iterations; original workspace preserved',
  files: manifest,
}, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ destination, files: manifest.length, bytes: manifest.reduce((n, f) => n + f.bytes, 0), verified: true }));
