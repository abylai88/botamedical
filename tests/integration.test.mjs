import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';

process.env.BOTA_DATA_DIR = await mkdtemp(join(tmpdir(), 'bota-test-'));
const { db, products, product, orders, digest } = await import('../lib/db.ts');
const { hashPassword, verifyPassword, session } = await import('../lib/auth.ts');
const { orderSchema, productSchema } = await import('../lib/validation.ts');
const base = 'http://127.0.0.1:3107';
const password = randomBytes(28).toString('base64url');
let server, cookie = '', logs = '';
async function request(path, method = 'GET', body, options = {}) {
  const headers = { ...(method !== 'GET' ? { origin: base, 'x-bota-request': '1', 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...options.headers };
  return fetch(base + path, { method, headers, body: body === undefined ? undefined : options.raw ? body : JSON.stringify(body), redirect: 'manual' });
}
before(async () => {
  db().prepare('INSERT INTO admins VALUES (?,?)').run('qa-admin', await hashPassword(password));
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3107'], { cwd: resolve('.'), env: { ...process.env, APP_ORIGIN: base, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { logs += chunk; }); server.stderr.on('data', chunk => { logs += chunk; });
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error('Test server exited: ' + logs);
    try { if ((await fetch(base)).ok) return; } catch {}
    await delay(250);
  }
  throw new Error('Test server timeout: ' + logs);
});
after(async () => { server?.kill(); if (server) await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); }); db().close(); });

test('server flows, persistence, validation and security boundaries', async t => {
  await t.test('all public pages render, nonce CSP and no private data leak', async () => {
    for (const path of ['/', '/catalog', '/catalog/bota-coat', '/cart', '/checkout', '/info', '/privacy', '/admin']) {
      const response = await request(path); assert.equal(response.status, 200, path);
      const html = await response.text(); assert.ok(!html.includes(password)); assert.ok(!html.includes('scrypt:'));
      assert.match(response.headers.get('content-security-policy'), /nonce-/);
      assert.ok(!response.headers.get('content-security-policy').includes('unsafe-eval'));
    }
    // Next.js keeps status 200 once a loading boundary has started streaming.
    const missing = await request('/catalog/missing');
    assert.ok([200, 404].includes(missing.status));
    const missingHtml = await missing.text();
    assert.ok(missingHtml.includes('Страница не найдена')); assert.match(missingHtml, /name="robots" content="noindex/);
  });
  await t.test('admin direct APIs reject unauthenticated calls and cross-origin mutations', async () => {
    for (const [path, method] of [['/api/admin/products', 'GET'], ['/api/admin/products', 'POST'], ['/api/admin/products/bota-coat', 'PUT'], ['/api/admin/products/bota-coat', 'DELETE'], ['/api/admin/media', 'POST'], ['/api/admin/orders/' + randomUUID(), 'PATCH']]) assert.equal((await request(path, method, method === 'GET' ? undefined : {})).status, 401);
    assert.equal((await request('/api/auth/login', 'POST', {}, { headers: { origin: 'https://example.com' } })).status, 403);
    assert.equal((await request('/api/orders', 'POST', {}, { headers: { 'x-bota-request': '' } })).status, 403);
  });
  await t.test('password hashing, login, HttpOnly cookie, server-side session', async () => {
    const stored = db().prepare('SELECT password FROM admins').get().password;
    assert.notEqual(stored, password); assert.equal(await verifyPassword('wrong', stored), false);
    assert.equal((await request('/api/auth/login', 'POST', { username: 'qa-admin', password: 'wrong' })).status, 401);
    const response = await request('/api/auth/login', 'POST', { username: 'qa-admin', password });
    assert.equal(response.status, 200);
    const setCookie = response.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly/i); assert.match(setCookie, /SameSite=strict/i); assert.match(setCookie, /Max-Age=28800/i);
    cookie = setCookie.split(';')[0]; assert.equal(session(cookie.split('=')[1]).username, 'qa-admin');
    assert.equal((await request('/api/admin/products')).status, 200);
  });
  let created;
  await t.test('CRUD, optimistic revision, literal text, categories and variants', async () => {
    const input = { name: 'QA <script>test</script>', description: 'Тестовая карточка', category: 'Тесты', price: 12345, sizes: ['S', 'M'], colors: ['Белый'], images: [], active: true, revision: 0 };
    const create = await request('/api/admin/products', 'POST', input); assert.equal(create.status, 201); created = await create.json();
    const page = await (await request('/catalog/' + created.id)).text(); assert.ok(page.includes('&lt;script&gt;')); assert.ok(!page.includes('<script>test</script>'));
    const update = { ...input, price: 23456, revision: created.revision };
    const response = await request('/api/admin/products/' + created.id, 'PUT', update); assert.equal(response.status, 200); created = await response.json();
    assert.equal(product(created.id).price, 23456);
    assert.equal((await request('/api/admin/products/' + created.id, 'PUT', update)).status, 409);
    assert.equal((await request('/api/admin/products/' + created.id, 'PUT', { ...update, images: ['https://example.com/image.jpg'] })).status, 400);
    assert.equal(productSchema.safeParse({ ...input, price: -1 }).success, false);
  });
  await t.test('image upload decodes bytes, rejects active files and persists sanitized WebP', async () => {
    const invalid = await request('/api/admin/media', 'POST', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>'), { raw: true, headers: { 'Content-Type': 'image/png' } });
    assert.equal(invalid.status, 400);
    const bytes = await sharp({ create: { width: 150, height: 200, channels: 3, background: '#073e34' } }).png().toBuffer();
    const response = await request('/api/admin/media', 'POST', bytes, { raw: true, headers: { 'Content-Type': 'application/octet-stream' } }); assert.equal(response.status, 201);
    const { url } = await response.json(); const media = await request(url); assert.equal(media.status, 200); assert.equal(media.headers.get('content-type'), 'image/webp');
    assert.equal((await sharp(Buffer.from(await media.arrayBuffer())).metadata()).format, 'webp');
    const { id, ...input } = created; input.images = [url];
    assert.equal((await request('/api/admin/products/' + id, 'PUT', input)).status, 200);
    assert.ok((await (await request('/catalog/' + id)).text()).includes(url));
  });
  let savedId;
  const payload = { requestId: randomUUID(), items: [{ productId: 'bota-coat', quantity: 2, size: '', color: '', expectedPrice: 290000 }], customer: { name: 'Тестовый покупатель', phone: '+000 000 0000', email: 'qa@example.test', note: 'Только тест' }, consent: true };
  await t.test('server validates quantities, variants, prices, consent and body size', async () => {
    assert.equal((await request('/api/orders', 'POST', { ...payload, consent: false })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...payload, items: [{ ...payload.items[0], quantity: -1 }] })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...payload, items: [{ ...payload.items[0], expectedPrice: 1 }] })).status, 409);
    assert.equal((await request('/api/orders', 'POST', { ...payload, items: [{ ...payload.items[0], size: 'FAKE' }] })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...payload, items: [payload.items[0], payload.items[0]] })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...payload, customer: { ...payload.customer, note: 'x'.repeat(40000) } })).status, 413);
    assert.equal(orderSchema.safeParse({ ...payload, total: 1 }).success, false);
  });
  await t.test('order persistence, authoritative totals, encryption and retry idempotency', async () => {
    const response = await request('/api/orders', 'POST', payload); assert.equal(response.status, 201); savedId = (await response.json()).id;
    const repeat = await request('/api/orders', 'POST', payload); assert.equal(repeat.status, 200); assert.equal((await repeat.json()).id, savedId);
    assert.equal(orders().length, 1); assert.equal(orders()[0].total, 580000); assert.equal(orders()[0].customer.name, payload.customer.name);
    const raw = db().prepare('SELECT payload FROM orders').get().payload; assert.ok(!raw.includes(payload.customer.name)); assert.ok(!raw.includes(payload.customer.email));
    assert.equal((await request('/api/orders', 'POST', { ...payload, customer: { ...payload.customer, name: 'Другой' } })).status, 409);
    assert.ok((await (await request('/admin')).text()).includes(payload.customer.name));
    const anonymous = await fetch(base + '/admin'); assert.ok(!(await anonymous.text()).includes(payload.customer.name));
  });
  await t.test('order status, deletion, catalog deletion and revoked sessions', async () => {
    assert.equal((await request('/api/admin/orders/' + savedId, 'PATCH', { status: 'reviewed' })).status, 200); assert.equal(orders()[0].status, 'reviewed');
    assert.equal((await request('/api/admin/orders/' + savedId, 'DELETE')).status, 200); assert.equal(orders().length, 0);
    assert.equal((await request('/api/admin/products/' + created.id, 'DELETE')).status, 200); assert.equal(product(created.id), undefined);
    assert.equal((await request('/api/auth/logout', 'POST')).status, 200);
    assert.equal((await request('/api/admin/products')).status, 401); assert.equal(session(cookie.split('=')[1]), null);
  });
  await t.test('login rate limits persist in SQLite', async () => {
    cookie = '';
    for (let i = 0; i < 5; i++) assert.equal((await request('/api/auth/login', 'POST', { username: 'unknown', password: 'wrong' })).status, 401);
    assert.equal((await request('/api/auth/login', 'POST', { username: 'unknown', password: 'wrong' })).status, 429);
  });
  await t.test('prepared instructions and five originals retain their recorded checksums', async () => {
    const lock = JSON.parse(await readFile('docs/agent-guides/sources.lock.json', 'utf8'));
    for (const entry of lock.upstream_files) assert.equal(digest(await readFile(entry.local_path)), entry.sha256, entry.local_path);
    for (const entry of lock.project_authored_files) assert.equal(digest(await readFile(entry.local_path || entry.path)), entry.sha256, entry.local_path || entry.path);
    const baseline = lock.existing_files_baseline;
    for (const entry of baseline) assert.equal(digest(await readFile(entry.local_path)), entry.sha256, entry.local_path);
  });
});
