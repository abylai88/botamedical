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
async function request(path, method = 'GET', body, options = {}) {
  const headers = { ...(method !== 'GET' ? { origin: base, 'x-bota-request': '1', 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...options.headers };
  return fetch(base + path, { method, headers, body: body === undefined ? undefined : options.raw ? body : JSON.stringify(body), redirect: 'manual' });
}
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
  await t.test('order persistence, authoritative totals, encryption and retry idempotency', async () => {
    const response = await request('/api/orders', 'POST', payload); assert.equal(response.status, 201); savedId = (await response.json()).id;
    const repeat = await request('/api/orders', 'POST', payload); assert.equal(repeat.status, 200); assert.equal((await repeat.json()).id, savedId);
    assert.equal(orders().length, 1); assert.equal(orders()[0].total, 580000); assert.equal(orders()[0].customer.name, payload.customer.name);
    const raw = db().prepare('SELECT payload FROM orders').get().payload; assert.ok(!raw.includes(payload.customer.name)); assert.ok(!raw.includes(payload.customer.email));
    assert.equal((await request('/api/orders', 'POST', { ...payload, customer: { ...payload.customer, name: 'Другой' } })).status, 409);
    assert.ok((await (await request('/admin')).text()).includes(payload.customer.name));
    const anonymous = await fetch(base + '/admin'); assert.ok(!(await anonymous.text()).includes(payload.customer.name));
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
      const { id } = await response.json(); const saved = orderPage('spam', 1).orders.find(o => o.id === id);
      assert.equal(saved?.spamReason, reason); assert.equal(saved.customer.name, payload.customer.name);
      return id;
    };
    const honeypot = await quarantined(order({ website: 'https://spam.example' }), 'honeypot');
    await quarantined(order({ formToken: undefined }), 'invalid');
    const forged = freshToken(); await quarantined(order({ formToken: forged.slice(0, -1) + (forged.endsWith('0') ? '1' : '0') }), 'invalid');
    assert.deepEqual(orderCounts(), { ...before, spam: before.spam + 3 }, 'Spam stays out of all orders and unprocessed');
    assert.ok(!orderPage('all', 1).orders.some(o => o.id === honeypot)); assert.ok(!orderPage('new', 1).orders.some(o => o.id === honeypot));
    // A person who submits within 3 seconds sees a clear message and can retry the same order.
    const quick = order({ formToken: issueFormToken() });
    const fast = await request('/api/orders', 'POST', quick, from('192.0.2.81'));
    assert.equal(fast.status, 400); assert.match((await fast.json()).error, /Подождите пару секунд/);
    assert.equal(orderCounts().spam, before.spam + 3, 'A fast click is not spam');
    const retry = await request('/api/orders', 'POST', { ...quick, formToken: issueFormToken(Date.now() - 3500) }, from('192.0.2.81'));
    assert.equal(retry.status, 201); const real = (await retry.json()).id;
    assert.ok(orderPage('new', 1).orders.some(o => o.id === real));
    assert.equal((await request('/api/orders', 'POST', order({ formToken: issueFormToken(Date.now() - 25 * 60 * 60_000) }), from('192.0.2.81'))).status, 400, 'A day-old page asks to refresh');
    spamId = honeypot;
  });
  await t.test('a form token places only one order', async () => {
    const token = freshToken(), first = { ...payload, requestId: randomUUID(), formToken: token };
    assert.equal((await request('/api/orders', 'POST', first, from('192.0.2.85'))).status, 201);
    assert.equal((await request('/api/orders', 'POST', first, from('192.0.2.85'))).status, 200, 'Retry of the same order still returns it');
    const second = await request('/api/orders', 'POST', { ...first, requestId: randomUUID() }, from('192.0.2.85'));
    assert.equal(second.status, 400); assert.match((await second.json()).error, /Обновите страницу/);
    assert.equal(db().prepare('SELECT count(*) AS n FROM used_form_tokens WHERE hash=?').get(digest(token)).n, 1);
    db().prepare('INSERT INTO used_form_tokens VALUES (?,?)').run('expired-token', Date.now() - 1);
    assert.equal((await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), formToken: freshToken() }, from('192.0.2.86'))).status, 201);
    assert.equal(db().prepare('SELECT count(*) AS n FROM used_form_tokens WHERE hash=?').get('expired-token').n, 0, 'Expired tokens are cleaned up');
  });
  await t.test('quarantine is limited per address and old spam is purged', async () => {
    const before = orderCounts().spam;
    for (let i = 0; i < 7; i++) assert.equal((await request('/api/orders', 'POST', { ...payload, requestId: randomUUID(), website: 'x' }, from('192.0.2.88'))).status, 201);
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
  });
  await t.test('admin order pages and the unprocessed tab show every order', async () => {
    const login = await request('/api/auth/login', 'POST', { username: 'qa-admin', password }, from('198.51.100.30'));
    assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0];
    const spamTab = await (await request('/admin?tab=spam')).text();
    assert.ok(spamTab.includes('Это настоящий заказ')); assert.ok(spamTab.includes('заполнено скрытое поле-ловушка'));
    assert.match(spamTab, /Спам \((?:<!-- -->)?\d+/);
    assert.equal((await request('/api/admin/orders/' + spamId, 'PATCH', { status: 'new' })).status, 200, '«Это настоящий заказ» releases it');
    assert.ok(orderPage('new', 1).orders.some(o => o.id === spamId)); assert.ok(!orderPage('spam', 1).orders.some(o => o.id === spamId));
    db().prepare('DELETE FROM orders').run();
    const insert = (created, status, name) => db().prepare('INSERT INTO orders VALUES (?,?,?,?,?,?)').run(randomUUID(), randomUUID(), 'test', created, status, encrypt({ customer: { name, phone: '+000', email: '', note: '' }, items: [], total: 100 }));
    insert('2020-01-01T00:00:00.000Z', 'new', 'Старый необработанный');
    for (let i = 0; i < 45; i++) insert(new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), 'reviewed', `Обработанный ${i}`);
    insert('2026-02-01T00:00:00.000Z', 'new', 'Свежий необработанный');
    const all = orderPage('all', 1);
    assert.deepEqual([all.total, all.pages, all.orders.length, all.orders[0].customer.name], [47, 3, 20, 'Свежий необработанный']);
    assert.equal(orderPage('all', 3).orders.length, 7); assert.equal(orderPage('all', 99).page, 3); assert.equal(orderPage('all', -1).page, 1);
    assert.equal(orderPage('all', 3).orders.at(-1).customer.name, 'Старый необработанный');
    assert.deepEqual(orderPage('new', 1).orders.map(o => o.customer.name), ['Свежий необработанный', 'Старый необработанный']);
    const page1 = await (await request('/admin?tab=orders')).text();
    assert.ok(page1.includes('Страница 1 из 3')); assert.ok(!page1.includes('Старый необработанный'), 'Old order is not on the first page');
    const page3 = await (await request('/admin?tab=orders&page=3')).text();
    assert.ok(page3.includes('Страница 3 из 3')); assert.ok(page3.includes('Старый необработанный'));
    const unprocessed = await (await request('/admin?tab=unprocessed')).text();
    assert.ok(unprocessed.includes('Старый необработанный'), 'Unprocessed tab shows old orders too'); assert.ok(unprocessed.includes('Свежий необработанный'));
    assert.ok(!unprocessed.includes('Обработанный 0')); assert.match(unprocessed, /Необработанные \((?:<!-- -->)?2/); assert.match(unprocessed, /Все заказы \((?:<!-- -->)?47/);
    const old = orderPage('new', 1).orders[1];
    assert.equal((await request('/api/admin/orders/' + old.id, 'PATCH', { status: 'reviewed' })).status, 200);
    assert.equal(orderPage('new', 1).total, 1, 'Processed order leaves the tab');
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
