import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';

process.env.BOTA_DATA_DIR = await mkdtemp(join(tmpdir(), 'bota-test-'));
// Installation step: the order key is created by an explicit command; the site never makes one itself.
const keyScript = () => spawnSync(process.execPath, ['scripts/order-key.mjs'], { env: process.env, encoding: 'utf8' });
const dbVerify = () => spawnSync(process.execPath, ['--conditions=react-server', 'scripts/db-verify.mjs'], { env: process.env, encoding: 'utf8' });
const keyCreated = keyScript(); assert.equal(keyCreated.status, 0, keyCreated.stderr); assert.match(keyCreated.stdout, /order-key created/);
const { db, products, product, orders, orderPage, orderCounts, purgeOldSpam, encrypt, digest } = await import('../lib/db.ts');
const { issueFormToken } = await import('../lib/form-token.ts');
const { hashPassword, verifyPassword, session } = await import('../lib/auth.ts');
const { orderSchema, productSchema } = await import('../lib/validation.ts');
const { clientIp } = await import('../lib/client-ip.ts');
const base = 'http://127.0.0.1:3107';
const password = randomBytes(28).toString('base64url');
let server, cookie = '', logs = '';
const from = ip => ({ headers: { 'x-forwarded-for': ip } });
// Form tokens are single-use: every order gets its own, issued a few seconds ago.
let tokenSeq = 0, spamId;
const freshToken = () => issueFormToken(Date.now() - 5000 - tokenSeq++);
const statusOf = id => db().prepare('SELECT status FROM orders WHERE id=?').get(id)?.status;
async function request(path, method = 'GET', body, options = {}) {
  const headers = { ...(method !== 'GET' ? { origin: base, 'x-bota-request': '1', 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...options.headers };
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : options.raw ? body : JSON.stringify(body), redirect: 'manual' });
  // Every "order accepted" answer in every test must point at an order that really is in the database.
  if (path === '/api/orders' && response.status === 201) {
    const { id } = await response.clone().json();
    assert.ok(db().prepare('SELECT 1 FROM orders WHERE id=?').get(id), `201 with an order number that is not saved: ${id}`);
    acceptedOrders++;
  }
  return response;
}
let acceptedOrders = 0;
before(async () => {
  db().prepare('INSERT INTO admins VALUES (?,?)').run('qa-admin', await hashPassword(password));
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3107'], { cwd: resolve('.'), env: { ...process.env, APP_ORIGIN: base, TRUST_PROXY: '1', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
    const privacy = await (await request('/privacy')).text();
    for (const part of ['Политика конфиденциальности', 'территории Республики Казахстан', 'WhatsApp', 'проверить у юриста']) assert.ok(privacy.includes(part), part);
    assert.ok((await (await request('/')).text()).includes('href="/privacy"'), 'Footer links to the privacy policy');
    // Next.js keeps status 200 once a loading boundary has started streaming.
    const missing = await request('/catalog/missing');
    assert.ok([200, 404].includes(missing.status));
    const missingHtml = await missing.text();
    assert.ok(missingHtml.includes('Страница не найдена')); assert.match(missingHtml, /name="robots" content="noindex/);
  });
  await t.test('admin direct APIs reject unauthenticated calls and cross-origin mutations', async () => {
    for (const [path, method] of [['/api/admin/products', 'GET'], ['/api/admin/products', 'POST'], ['/api/admin/products/bota-coat', 'PUT'], ['/api/admin/products/bota-coat', 'DELETE'], ['/api/admin/media', 'POST'], ['/api/admin/orders/' + randomUUID(), 'PATCH'], ['/api/admin/comments/' + randomUUID(), 'PATCH'], ['/api/admin/comments/' + randomUUID(), 'DELETE']]) assert.equal((await request(path, method, method === 'GET' ? undefined : {})).status, 401);
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
  await t.test('site texts, footer info and home photos are editable by the admin only', async () => {
    const body = { texts: { ru: { 'home.title': 'Новый <b>заголовок</b>', 'footer.infoText': 'Алматы, ул. Тестовая, 1' }, en: { 'home.title': 'New headline' } }, images: { hero2: '/images/look-02.webp' } };
    const saved = cookie; cookie = '';
    assert.equal((await request('/api/admin/site', 'PUT', body)).status, 401);
    cookie = saved;
    assert.equal((await request('/api/admin/site', 'PUT', body, { headers: { origin: 'https://example.com' } })).status, 403);
    assert.equal((await request('/api/admin/site', 'PUT', { ...body, images: { hero2: 'https://example.com/x.webp' } })).status, 400);
    assert.equal((await request('/api/admin/site', 'PUT', { ...body, texts: { ...body.texts, ru: { unknown: 'x' } } })).status, 400);
    assert.equal((await request('/api/admin/site', 'PUT', body)).status, 200);
    const home = await (await request('/')).text();
    assert.ok(home.includes('Новый &lt;b&gt;заголовок&lt;/b&gt;')); assert.ok(!home.includes('<b>заголовок</b>'));
    assert.ok(home.includes('Алматы, ул. Тестовая, 1')); assert.ok(home.includes('₸'));
    const english = await (await request('/', 'GET', undefined, { headers: { cookie: 'bota_lang=en' } })).text();
    assert.ok(english.includes('New headline')); assert.ok(english.includes('lang="en"'));
    assert.equal((await request('/api/admin/site', 'PUT', { texts: { ru: {}, en: {} }, images: {} })).status, 200);
    assert.ok(!(await (await request('/')).text()).includes('Алматы, ул. Тестовая, 1'));
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
  const payload = { requestId: randomUUID(), items: [{ productId: 'bota-coat', quantity: 2, size: '', color: '', expectedPrice: 290000 }], customer: { name: 'Тестовый покупатель', phone: '+000 000 0000', email: 'qa@example.test', note: 'Только тест' }, consent: true, website: '', formToken: freshToken() };
  await t.test('server validates quantities, variants, prices, consent and body size', async () => {
    assert.equal((await request('/api/orders', 'POST', { ...payload, consent: false })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...payload, items: [{ ...payload.items[0], quantity: -1 }] })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...payload, items: [{ ...payload.items[0], expectedPrice: 1 }] })).status, 409);
    assert.equal((await request('/api/orders', 'POST', { ...payload, items: [{ ...payload.items[0], size: 'FAKE' }] })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...payload, items: [payload.items[0], payload.items[0]] })).status, 400);
    assert.equal((await request('/api/orders', 'POST', { ...payload, customer: { ...payload.customer, note: 'x'.repeat(40000) } })).status, 413);
    assert.equal(orderSchema.safeParse({ ...payload, total: 1 }).success, false);
  });
  await t.test('order key is never replaced or created by the site; without it no order is taken', async () => {
    const keyFile = join(process.env.BOTA_DATA_DIR, 'order-key'); const original = await readFile(keyFile);
    const again = keyScript(); assert.equal(again.status, 0); assert.match(again.stdout, /already exists/); assert.deepEqual(await readFile(keyFile), original);
    const count = () => db().prepare('SELECT count(*) AS c FROM orders').get().c; const saved = count();
    await rename(keyFile, keyFile + '.away');
    try {
      const response = await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), formToken: freshToken() }, from('192.0.2.150'));
      assert.equal(response.status, 503); assert.match((await response.json()).error, /Не удалось оформить заказ/);
      assert.equal(existsSync(keyFile), false, 'The site must not create a key by itself'); assert.equal(count(), saved);
      assert.equal((await request('/readyz')).status, 503, 'Not ready without the order key'); assert.equal((await request('/healthz')).status, 200);
      assert.equal(dbVerify().status, 1);
    } finally { await rename(keyFile + '.away', keyFile); }
  });
  await t.test('order persistence, authoritative totals, encryption and retry idempotency', async () => {
    const response = await request('/api/orders', 'POST', payload); assert.equal(response.status, 201); savedId = (await response.json()).id;
    const repeat = await request('/api/orders', 'POST', payload); assert.equal(repeat.status, 200); assert.equal((await repeat.json()).id, savedId);
    assert.equal(orders().length, 1); assert.equal(orders()[0].total, 580000); assert.equal(orders()[0].customer.name, payload.customer.name);
    assert.equal(orders()[0].consentAt, orders()[0].createdAt, 'Consent time is saved with the order'); assert.match(orders()[0].privacyVersion, /^\d{4}-\d{2}-\d{2}$/);
    const raw = db().prepare('SELECT payload FROM orders').get().payload; assert.ok(!raw.includes(payload.customer.name)); assert.ok(!raw.includes(payload.customer.email));
    assert.equal((await request('/api/orders', 'POST', { ...payload, customer: { ...payload.customer, name: 'Другой' } })).status, 409);
    assert.ok((await (await request('/admin')).text()).includes(payload.customer.name));
    const anonymous = await fetch(base + '/admin'); assert.ok(!(await anonymous.text()).includes(payload.customer.name));
  });
  await t.test('readyz and db:verify catch an order key that cannot open the saved orders', async () => {
    assert.ok(orders().length > 0, 'Needs a saved order');
    const ready = await request('/readyz'); assert.equal(ready.status, 200); assert.deepEqual(await ready.json(), { status: 'ready' });
    const ok = dbVerify(); assert.equal(ok.status, 0, ok.stderr); assert.match(ok.stdout, /^OK: .* 1 newest orders decrypted/); assert.ok(!ok.stdout.includes(payload.customer.name));
    const keyFile = join(process.env.BOTA_DATA_DIR, 'order-key'); const original = await readFile(keyFile);
    await writeFile(keyFile, randomBytes(32));
    try {
      const wrong = await request('/readyz'); assert.equal(wrong.status, 503); assert.deepEqual(await wrong.json(), { status: 'not ready' });
      const failed = dbVerify(); assert.equal(failed.status, 1); assert.match(failed.stderr, /1 of 1 newest orders cannot be decrypted/); assert.ok(!failed.stderr.includes(payload.customer.name));
    } finally { await writeFile(keyFile, original); }
    assert.equal((await request('/readyz')).status, 200);
  });
  await t.test('comments under each look: public post, validation, staff badge, moderation', async () => {
    const admin = cookie; cookie = '';
    const post = (id, body, options) => request(`/api/products/${id}/comments`, 'POST', body, options);
    const created1 = await post('bota-coat', { author: 'Анна', body: 'Хорошая посадка <b>и</b> ткань' });
    assert.equal(created1.status, 201); const visitor = await created1.json(); assert.equal(visitor.staff, false); assert.equal(visitor.status, 'published');
    const html = await (await request('/catalog/bota-coat')).text();
    assert.ok(html.includes('Хорошая посадка &lt;b&gt;и&lt;/b&gt; ткань')); assert.ok(!html.includes('<b>и</b>'));
    assert.equal((await post('bota-coat', { author: 'А', body: 'коротко' })).status, 400);
    assert.equal((await post('bota-coat', { author: 'Спам', body: 'смотри https://example.com' })).status, 400);
    assert.equal((await post('bota-coat', { author: 'Бот', body: 'текст', website: 'x' })).status, 400);
    assert.equal((await post('bota-coat', { author: 'Анна', body: 'x'.repeat(1001) })).status, 400);
    assert.equal((await post('missing-look', { author: 'Анна', body: 'текст' })).status, 404);
    assert.equal((await post('bota-coat', { author: 'Анна', body: 'текст' }, { headers: { origin: 'https://example.com' } })).status, 403);
    assert.equal((await request('/api/admin/comments/' + visitor.id, 'PATCH', { status: 'hidden' })).status, 401);
    cookie = admin;
    const staff = await post(created.id, { author: 'Команда', body: 'Ответ магазина' }); assert.equal(staff.status, 201); assert.equal((await staff.json()).staff, true);
    assert.ok((await (await request('/admin')).text()).includes('Хорошая посадка'));
    assert.equal((await request('/api/admin/comments/' + visitor.id, 'PATCH', { status: 'hidden' })).status, 200);
    assert.ok(!(await (await request('/catalog/bota-coat')).text()).includes('Хорошая посадка'));
    assert.equal((await request('/api/admin/comments/' + visitor.id, 'PATCH', { status: 'published' })).status, 200);
    assert.ok((await (await request('/catalog/bota-coat')).text()).includes('Хорошая посадка'));
    assert.equal((await request('/api/admin/comments/' + visitor.id, 'DELETE')).status, 200);
    assert.equal((await request('/api/admin/comments/' + visitor.id, 'DELETE')).status, 404);
  });
  await t.test('order status, deletion, catalog deletion and revoked sessions', async () => {
    assert.equal((await request('/api/admin/orders/' + savedId, 'PATCH', { status: 'reviewed' })).status, 200); assert.equal(orders()[0].status, 'reviewed');
    assert.equal((await request('/api/admin/orders/' + savedId, 'DELETE')).status, 200); assert.equal(orders().length, 0);
    assert.equal((await request('/api/admin/products/' + created.id, 'DELETE')).status, 200); assert.equal(product(created.id), undefined);
    assert.equal(db().prepare('SELECT count(*) AS n FROM comments WHERE product_id=?').get(created.id).n, 0, 'Comments go with the product');
    assert.equal((await request('/api/auth/logout', 'POST')).status, 200);
    assert.equal((await request('/api/admin/products')).status, 401); assert.equal(session(cookie.split('=')[1]), null);
  });
  await t.test('login rate limits persist in SQLite', async () => {
    cookie = '';
    for (let i = 0; i < 5; i++) assert.equal((await request('/api/auth/login', 'POST', { username: 'unknown', password: 'wrong' })).status, 401);
    assert.equal((await request('/api/auth/login', 'POST', { username: 'unknown', password: 'wrong' })).status, 429);
  });
  await t.test('login limits are per address: one blocked IP does not lock the owner out', async () => {
    const login = (username, secret, ip) => request('/api/auth/login', 'POST', { username, password: secret }, from(ip));
    for (let i = 0; i < 5; i++) assert.equal((await login('qa-admin', 'wrong', '203.0.113.7')).status, 401);
    const blocked = await login('qa-admin', password, '203.0.113.7');
    assert.equal(blocked.status, 429, 'Even the right password waits on the blocked address');
    assert.match((await blocked.json()).error, /сек/);
    assert.equal((await login('qa-admin', password, '198.51.100.20')).status, 200, 'Owner from another address logs in');
    // A spoofed earlier hop does not change the address: the proxy-appended last entry counts.
    assert.equal((await login('qa-admin', password, '198.51.100.99, 203.0.113.7')).status, 429);
    // One address spraying many usernames hits the per-IP limit; others stay free.
    for (let i = 0; i < 30; i++) assert.equal((await login('user' + i, 'wrong', '192.0.2.50')).status, 401);
    assert.equal((await login('user-next', 'wrong', '192.0.2.50')).status, 429);
    assert.equal((await login('user-next', 'wrong', '192.0.2.51')).status, 401);
  });
  await t.test('bot protection: honeypot and bad tokens go to quarantine, a fast click is asked to retry', async () => {
    const before = orderCounts();
    const order = (extra = {}) => ({ ...payload, requestId: randomUUID(), formToken: freshToken(), ...extra });
    const quarantined = async (body, reason) => {
      const response = await request('/api/orders', 'POST', body, from('192.0.2.80'));
      assert.equal(response.status, 201, 'Looks like success to a bot');
      const { id } = await response.json(); const saved = orderPage('spam').orders.find(o => o.id === id);
      assert.equal(saved?.spamReason, reason); assert.equal(saved.customer.name, payload.customer.name);
      return id;
    };
    const honeypot = await quarantined(order({ website: 'https://spam.example' }), 'honeypot');
    await quarantined(order({ formToken: undefined }), 'invalid');
    const forged = freshToken(); await quarantined(order({ formToken: forged.slice(0, -1) + (forged.endsWith('0') ? '1' : '0') }), 'invalid');
    assert.deepEqual(orderCounts(), { ...before, spam: before.spam + 3 }, 'Spam stays out of all orders and unprocessed');
    assert.equal(statusOf(honeypot), 'spam'); assert.ok(!orderPage('all').orders.some(o => o.id === honeypot));
    // A person who submits within 3 seconds sees a clear message and can retry the same order.
    const quick = order({ formToken: issueFormToken() });
    const fast = await request('/api/orders', 'POST', quick, from('192.0.2.81'));
    assert.equal(fast.status, 400); assert.match((await fast.json()).error, /Подождите пару секунд/);
    assert.equal(orderCounts().spam, before.spam + 3, 'A fast click is not spam');
    const retry = await request('/api/orders', 'POST', { ...quick, formToken: issueFormToken(Date.now() - 3500) }, from('192.0.2.81'));
    assert.equal(retry.status, 201); const real = (await retry.json()).id;
    assert.equal(statusOf(real), 'new');
    assert.equal((await request('/api/orders', 'POST', order({ formToken: issueFormToken(Date.now() - 25 * 60 * 60_000) }), from('192.0.2.81'))).status, 400, 'A day-old page asks to refresh');
    spamId = honeypot;
  });
  await t.test('a form token places only one order', async () => {
    const token = freshToken(), first = { ...payload, requestId: randomUUID(), formToken: token };
    assert.equal((await request('/api/orders', 'POST', first, from('192.0.2.85'))).status, 201);
    assert.equal((await request('/api/orders', 'POST', first, from('192.0.2.85'))).status, 200, 'Retry of the same order still returns it');
    const second = await request('/api/orders', 'POST', { ...first, requestId: randomUUID() }, from('192.0.2.85'));
    assert.equal(second.status, 400); assert.match((await second.json()).error, /Обновите страницу/);
    assert.equal(db().prepare('SELECT count(*) AS n FROM used_form_tokens WHERE hash=?').get(digest(token.split('.')[1])).n, 1, 'Marked used by its random id');
    // Two customers whose forms rendered in the same millisecond both get through.
    const sameMoment = Date.now() - 5000, a = issueFormToken(sameMoment), b = issueFormToken(sameMoment);
    assert.notEqual(a, b); assert.equal(a.split('.')[0], b.split('.')[0]);
    for (const [formToken, ip] of [[a, '192.0.2.83'], [b, '192.0.2.84']]) assert.equal((await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), formToken }, from(ip))).status, 201);
    db().prepare('INSERT INTO used_form_tokens VALUES (?,?)').run('expired-token', Date.now() - 1);
    assert.equal((await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), formToken: freshToken() }, from('192.0.2.86'))).status, 201);
    assert.equal(db().prepare('SELECT count(*) AS n FROM used_form_tokens WHERE hash=?').get('expired-token').n, 0, 'Expired tokens are cleaned up');
  });
  await t.test('quarantine is limited per address and old spam is purged', async () => {
    const before = orderCounts().spam;
    for (let i = 0; i < 5; i++) assert.equal((await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), website: 'x' }, from('192.0.2.88'))).status, 201);
    // Over the quarantine limit: an honest error with the WhatsApp link from the site settings, never a number.
    db().prepare('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run('site-content-v1', JSON.stringify({ texts: { ru: { 'contact.whatsapp': '+7 777 123 45 67' }, en: {} }, images: {} }));
    for (let i = 0; i < 2; i++) {
      const full = await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), website: 'x' }, from('192.0.2.88'));
      assert.equal(full.status, 429); const body = await full.json();
      assert.match(body.error, /Не удалось оформить заказ/); assert.equal(body.whatsapp, 'https://wa.me/77771234567'); assert.equal(body.id, undefined);
    }
    db().prepare('DELETE FROM meta WHERE key=?').run('site-content-v1');
    assert.equal(orderCounts().spam, before + 5, 'Only 5 spam orders per hour from one address are stored');
    assert.equal((await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), website: 'x' }, from('192.0.2.89'))).status, 201);
    assert.equal(orderCounts().spam, before + 6);
    const insert = (created, status) => { const id = randomUUID(); db().prepare('INSERT INTO orders(id,request_id,request_hash,created,status,payload) VALUES (?,?,?,?,?,?)').run(id, randomUUID(), 'test', created, status, encrypt({ customer: payload.customer, items: [], total: 0 })); return id; };
    const oldSpam = insert(new Date(Date.now() - 31 * 86_400_000).toISOString(), 'spam');
    const oldReal = insert(new Date(Date.now() - 400 * 86_400_000).toISOString(), 'new');
    purgeOldSpam();
    assert.equal(db().prepare('SELECT count(*) AS n FROM orders WHERE id=?').get(oldSpam).n, 0, 'Spam older than 30 days is removed');
    assert.equal(db().prepare('SELECT count(*) AS n FROM orders WHERE id=?').get(oldReal).n, 1, 'Old real orders stay');
  });
  await t.test('orders are limited to 5 per hour per address', async () => {
    const order = () => ({ ...payload, requestId: randomUUID(), formToken: freshToken() });
    for (let i = 0; i < 5; i++) assert.equal((await request('/api/orders', 'POST', order(), from('192.0.2.90'))).status, 201);
    assert.equal((await request('/api/orders', 'POST', order(), from('192.0.2.90'))).status, 429);
    assert.equal((await request('/api/orders', 'POST', order(), from('192.0.2.91'))).status, 201, 'Another customer is not blocked');
  });
  await t.test('a flood from one address does not use up the shared emergency limits', async () => {
    const counter = key => db().prepare('SELECT count FROM rate_limits WHERE key=?').get(digest(key))?.count ?? 0;
    for (let i = 0; i < 300; i++) await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), formToken: freshToken() }, from('192.0.2.200'));
    assert.ok(counter('orders-global') < 300, 'Orders rejected by the address limit are not counted globally');
    assert.equal((await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), formToken: freshToken() }, from('192.0.2.201'))).status, 201, 'Another customer can still order');
    for (let i = 0; i < 1000; i++) await request('/api/auth/login', 'POST', { username: 'flood', password: 'wrong' }, from('192.0.2.210'));
    assert.ok(counter('login-global') < 1000, 'Logins rejected per address are not counted globally');
    assert.equal((await request('/api/auth/login', 'POST', { username: 'qa-admin', password }, from('198.51.100.40'))).status, 200, 'Owner logs in from another address');
    assert.ok(acceptedOrders >= 20, 'Every 201 so far was checked against the database');
  });
  await t.test('comments are limited per address before the shared counters', async () => {
    const counter = key => db().prepare('SELECT count FROM rate_limits WHERE key=?').get(digest(key))?.count ?? 0;
    const post = (i, ip) => request('/api/products/bota-coat/comments', 'POST', { author: `Гость ${i}`, body: 'Отличная ткань' }, from(ip));
    for (let i = 0; i < 5; i++) assert.equal((await post(i, '192.0.2.220')).status, 201);
    for (let i = 5; i < 100; i++) assert.equal((await post(i, '192.0.2.220')).status, 429);
    assert.ok(counter('comments-global') < 60 && counter('comments:bota-coat') < 20, 'Rejected comments are not counted globally or per product');
    assert.equal((await post(100, '192.0.2.221')).status, 201, 'Another visitor can still comment');
  });
  await t.test('admin order pages and the unprocessed tab show every order', async () => {
    const login = await request('/api/auth/login', 'POST', { username: 'qa-admin', password }, from('198.51.100.30'));
    assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0];
    const spamTab = await (await request('/admin?tab=spam')).text();
    assert.ok(spamTab.includes('Это настоящий заказ')); assert.ok(spamTab.includes('заполнено скрытое поле-ловушка'));
    assert.match(spamTab, /Спам \((?:<!-- -->)?\d+/);
    assert.equal((await request('/api/admin/orders/' + spamId, 'PATCH', { status: 'new' })).status, 200, '«Это настоящий заказ» releases it');
    assert.equal(statusOf(spamId), 'new'); assert.ok(!orderPage('spam').orders.some(o => o.id === spamId));
    db().prepare('DELETE FROM orders').run();
    const insert = (created, status, name) => db().prepare('INSERT INTO orders VALUES (?,?,?,?,?,?)').run(randomUUID(), randomUUID(), 'test', created, status, encrypt({ customer: { name, phone: '+000', email: '', note: '' }, items: [], total: 100 }));
    insert('2020-01-01T00:00:00.000Z', 'new', 'Старый необработанный');
    for (let i = 0; i < 45; i++) insert(new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), 'reviewed', `Обработанный ${i}`);
    insert('2026-02-01T00:00:00.000Z', 'new', 'Свежий необработанный');
    const all = orderPage('all');
    assert.deepEqual([all.total, all.orders.length, all.orders[0].customer.name, all.newer], [47, 20, 'Свежий необработанный', null]);
    // Walk every page by cursor: each order exactly once, newest to oldest, ending with the oldest.
    const walk = (view, between = () => {}) => {
      const seen = []; let page = orderPage(view);
      for (;;) { seen.push(...page.orders.map(o => o.id)); between(page); if (!page.older) return seen; page = orderPage(view, { after: page.older }); }
    };
    const ids = db().prepare("SELECT id FROM orders WHERE status!='spam' ORDER BY created DESC, id DESC").all().map(r => r.id);
    assert.deepEqual(walk('all'), ids);
    // A new order arriving between pages: no repeats, no gaps among the orders already listed.
    let arrived = 0;
    const withArrival = walk('all', () => { if (!arrived++) insert(new Date().toISOString(), 'new', 'Пришёл во время просмотра'); });
    assert.deepEqual(withArrival, ids, 'Earlier pages stay put when a new order arrives');
    db().prepare("DELETE FROM orders WHERE request_hash='test' AND status='new' AND created > '2026-06-01'").run();
    // Processing orders on the page being viewed: the next unprocessed page continues without gaps.
    for (let i = 0; i < 25; i++) insert(new Date(Date.UTC(2026, 2, 1, 0, i)).toISOString(), 'new', `Новый ${i}`);
    const unprocessedIds = db().prepare("SELECT id FROM orders WHERE status='new' ORDER BY created DESC, id DESC").all().map(r => r.id);
    assert.equal(unprocessedIds.length, 27);
    const processedFirst = walk('new', page => { for (const o of page.orders.slice(0, 3)) db().prepare("UPDATE orders SET status='reviewed' WHERE id=?").run(o.id); });
    assert.deepEqual(processedFirst, unprocessedIds, 'Every unprocessed order is seen once even while some are processed');
    for (const id of unprocessedIds) db().prepare("UPDATE orders SET status='new' WHERE id=?").run(id);
    // Going back with "Новее" returns the previous page.
    const second = orderPage('all', { after: orderPage('all').older });
    assert.deepEqual(orderPage('all', { before: second.newer }).orders.map(o => o.id), orderPage('all').orders.map(o => o.id));
    assert.equal(orderPage('all', { after: 'garbage' }).orders[0].id, orderPage('all').orders[0].id, 'A broken cursor shows the first page');
    const page1 = await (await request('/admin?tab=orders')).text();
    assert.ok(page1.includes('Старее →')); assert.ok(!page1.includes('Старый необработанный'), 'Old order is not on the first page');
    const lastCursor = (() => { let p = orderPage('all'); while (p.older) { const next = orderPage('all', { after: p.older }); if (!next.older) return p.older; p = next; } })();
    const lastPage = await (await request('/admin?tab=orders&after=' + encodeURIComponent(lastCursor))).text();
    assert.ok(lastPage.includes('Старый необработанный')); assert.ok(lastPage.includes('← Новее'));
    // A valid cursor whose remaining orders disappeared meanwhile: "end of list", not a jump to the start.
    // Here: the owner opens page 1 of «Необработанные» while every older order gets processed.
    const newCursor = orderPage('new').older;
    const tail = orderPage('new', { after: newCursor }).orders.map(o => o.id);
    assert.ok(tail.length > 0);
    for (const id of tail) db().prepare("UPDATE orders SET status='reviewed' WHERE id=?").run(id);
    const end = orderPage('new', { after: newCursor });
    assert.deepEqual([end.end, end.orders.length, end.newer, end.older], [true, 0, newCursor, null]);
    assert.equal(orderPage('new', { before: end.newer }).orders.length, 20, '«← Новее» leads back to a full page');
    const endHtml = await (await request('/admin?tab=unprocessed&after=' + encodeURIComponent(newCursor))).text();
    assert.ok(endHtml.includes('Это конец списка')); assert.ok(endHtml.includes('← Новее'));
    for (const id of tail) db().prepare("UPDATE orders SET status='new' WHERE id=?").run(id);
    assert.equal(orderPage('all', { after: 'garbage' }).end, false, 'A broken cursor still shows the first page');
    const unprocessed = await (await request('/admin?tab=unprocessed')).text();
    assert.ok(unprocessed.includes('Новый 24'), 'Newest unprocessed order is first');
    assert.ok(!unprocessed.includes('Обработанный 0')); assert.match(unprocessed, /Необработанные \((?:<!-- -->)?\d+/); assert.match(unprocessed, /Все заказы \((?:<!-- -->)?\d+/);
    const old = db().prepare("SELECT id FROM orders WHERE created='2020-01-01T00:00:00.000Z'").get();
    assert.equal(statusOf(old.id), 'new', 'Old unprocessed order stays in the tab regardless of age');
    const before = orderPage('new').total;
    assert.equal((await request('/api/admin/orders/' + old.id, 'PATCH', { status: 'reviewed' })).status, 200);
    assert.equal(orderPage('new').total, before - 1, 'Processed order leaves the tab');
    assert.ok(!(await (await fetch(base + '/admin?tab=unprocessed')).text()).includes('Свежий необработанный'), 'Anonymous visitors see no orders');
  });
  await t.test('prepared instructions and five originals retain their recorded checksums', async () => {
    const lock = JSON.parse(await readFile('docs/agent-guides/sources.lock.json', 'utf8'));
    for (const entry of lock.upstream_files) assert.equal(digest(await readFile(entry.local_path)), entry.sha256, entry.local_path);
    for (const entry of lock.project_authored_files) {
      const path = entry.local_path || entry.path;
      let bytes = await readFile(path);
      // Next 16.4 appends its own docs-routing block on dev startup. Preserve it,
      // but still verify every byte of the previously approved BOTA instructions.
      if (path === 'AGENTS.md') {
        const marker = bytes.indexOf('\n<!-- BEGIN:nextjs-agent-rules -->');
        if (marker !== -1) {
          const suffix = bytes.subarray(marker).toString('utf8');
          assert.match(suffix, /^\n<!-- BEGIN:nextjs-agent-rules -->\n[\s\S]*<!-- END:nextjs-agent-rules -->\n?$/);
          assert.equal(suffix.split('<!-- BEGIN:nextjs-agent-rules -->').length, 2);
          bytes = bytes.subarray(0, marker);
        }
      }
      assert.equal(digest(bytes), entry.sha256, path);
    }
    const baseline = lock.existing_files_baseline;
    for (const entry of baseline) assert.equal(digest(await readFile(entry.local_path)), entry.sha256, entry.local_path);
  });
});

test('client address comes from proxy headers only with TRUST_PROXY=1', () => {
  const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.9', 'x-real-ip': '5.6.7.8' });
  assert.equal(clientIp(headers, {}), 'shared', 'Without TRUST_PROXY a spoofable header is ignored');
  assert.equal(clientIp(headers, { TRUST_PROXY: '1' }), '10.0.0.9');
  assert.equal(clientIp(new Headers({ 'x-real-ip': '5.6.7.8' }), { TRUST_PROXY: '1' }), '5.6.7.8');
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': 'not-an-ip' }), { TRUST_PROXY: '1' }), 'shared');
  assert.equal(clientIp(new Headers(), { TRUST_PROXY: '1' }), 'shared');
});
