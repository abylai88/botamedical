import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { appOrigin } from '../lib/deployment.ts';

test('trusted origin uses deployment configuration and rejects unsafe origins', () => {
  assert.equal(appOrigin({}), 'http://127.0.0.1:3000');
  assert.equal(appOrigin({ RENDER_EXTERNAL_URL: 'https://botamedical.onrender.com' }), 'https://botamedical.onrender.com');
  assert.equal(appOrigin({ APP_ORIGIN: 'https://custom.example', RENDER_EXTERNAL_URL: 'https://other.example' }), 'https://custom.example');
  for (const value of ['http://public.example', 'https://user:password@example.com', 'https://example.com/path', 'javascript:alert(1)', 'https://example.com/?secret=value']) assert.throws(() => appOrigin({ APP_ORIGIN: value }));
});

test('public demo works behind an HTTPS host and never accepts private writes', async () => {
  const base = 'http://127.0.0.1:3110';
  const host = 'botamedical.example';
  const folder = await mkdtemp(join(tmpdir(), 'bota-public-test-'));
  const server = spawn(process.execPath, ['scripts/run-next.mjs', 'start'], { env: {
    ...process.env, PORT: '3110', RENDER: 'true', RENDER_EXTERNAL_URL: `https://${host}`,
    APP_ORIGIN: '', BOTA_PUBLIC_DEMO: '1', BOTA_DATA_DIR: folder, BOTA_BIND_HOST: '127.0.0.1',
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; server.stdout.on('data', b => { logs += b; }); server.stderr.on('data', b => { logs += b; });
  // node:http deliberately allows testing a proxy Host without external DNS/TLS.
  const request = (path, options = {}) => new Promise((resolve, reject) => {
    const request = httpRequest(base + path, { ...options, headers: { host, ...options.headers } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: response.statusCode, headers: Object.fromEntries(Object.entries(response.headers).filter(([, v]) => v !== undefined).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v])) })));
    });
    request.on('error', reject); request.end();
  });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (server.exitCode !== null) throw new Error('Preview server exited: ' + logs);
      try { if ((await request('/healthz')).ok) { ready = true; break; } } catch {}
      await delay(250);
    }
    assert.ok(ready, 'Demo server must start');
    for (const path of ['/', '/catalog', '/catalog/bota-coat', '/cart', '/info', '/privacy']) {
      const response = await request(path); assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-security-policy'), /upgrade-insecure-requests/);
      const html = await response.text(); assert.ok(html.includes('BOTA')); assert.ok(!html.includes('scrypt:'));
    }
    const checkout = await request('/checkout'); assert.equal(checkout.status, 200);
    const html = await checkout.text(); assert.ok(html.includes('Пока только знакомство')); assert.ok(!html.includes('name="phone"'));
    for (const [path, method] of [['/admin', 'GET'], ['/api/admin/products', 'GET'], ['/api/admin/products', 'POST'], ['/api/auth/login', 'POST'], ['/api/auth/logout', 'POST'], ['/api/orders', 'POST'], ['/api/admin/media', 'POST'], ['/media/unknown.webp', 'GET']]) {
      const response = await request(path, { method, headers: { origin: `https://${host}`, 'x-bota-request': '1' } });
      assert.equal(response.status, 403, path);
    }
    assert.equal((await request('/', { headers: { host: 'attacker.example' } })).status, 403);
    assert.equal((await request('/healthz', { headers: { host: 'internal.render.local' } })).status, 200);
  } finally {
    server.kill();
    await new Promise(resolve => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
  }
});
