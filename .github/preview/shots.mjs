// TEMPORARY: screenshots and layout checks for the about-page review. Removed before merge.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const require = createRequire(process.env.NODE_PATH + '/');
const { chromium } = require('playwright');
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:3000';
const pages = [['about-ru', '/about?lang=ru'], ['about-kk', '/about?lang=kk'], ['about-en', '/about?lang=en'], ['home', '/']];
const widths = [1440, 900, 390];
const report = [];
const browser = await chromium.launch();
for (const [name, path] of pages) for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage(); const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3400);
  await page.screenshot({ path: join(out, `${name}-${width}-top.png`) });
  // Scroll through so lazy images load, then a full-page shot.
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, `${name}-${width}-full.png`), fullPage: true });
  const layout = await page.evaluate(() => {
    const doc = document.documentElement; const wide = [];
    for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > doc.clientWidth + 1 || r.left < -1)) { const cs = getComputedStyle(el); if (cs.position !== 'fixed') wide.push(`${el.tagName.toLowerCase()}.${el.className}`.slice(0, 80)); } }
    const broken = [...document.images].filter(i => i.complete && !i.naturalWidth).map(i => i.src);
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflow: doc.scrollWidth > doc.clientWidth, wide: [...new Set(wide)].slice(0, 15), broken };
  });
  report.push({ name, width, ...layout, errors });
  await context.close();
}
// Keyboard: tab through the about page and capture the focused elements.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await context.newPage();
  await page.goto(base + '/about?lang=kk', { waitUntil: 'networkidle' }); const focus = [];
  for (let i = 0; i < 14; i++) { await page.keyboard.press('Tab'); focus.push(await page.evaluate(() => { const a = document.activeElement; return `${a.tagName} ${a.getAttribute('href') || ''} ${(a.textContent || '').trim().slice(0, 30)}`; })); }
  await page.screenshot({ path: join(out, 'focus-1440.png') });
  report.push({ name: 'keyboard', focus }); await context.close();
}
// Reduced motion: the seam and Almaty label must be visible at once.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); const page = await context.newPage();
  await page.goto(base + '/about?lang=ru', { waitUntil: 'networkidle' }); await page.waitForTimeout(200);
  await page.screenshot({ path: join(out, 'reduced-motion-1440.png') });
  report.push({ name: 'reduced-motion', toOpacity: await page.evaluate(() => getComputedStyle(document.querySelector('.route-to')).opacity) });
  await context.close();
}
await browser.close();
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
