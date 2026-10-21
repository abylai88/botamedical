// Builds transparent brand marks and favicons from the original BOTA logo photo (logo.jpg/).
// The original is only read. Run: node scripts/brand-assets.mjs
import { readdir, mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const source = `logo.jpg/${(await readdir('logo.jpg'))[0]}`;
const BRAND = [13, 59, 54]; // ink colour of the logo
const { data, info } = await sharp(source).rotate().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// Darkness → alpha. Off-white paper and the faint corner watermark fall below the floor and vanish.
function alphaAt(x, y) {
  const i = (y * width + x) * channels;
  const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  return Math.max(0, Math.min(255, Math.round((215 - lum) / (215 - 60) * 255)));
}
function extract(box, keep = () => true) {
  const w = box.right - box.left, h = box.bottom - box.top;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = box.left + x, sy = box.top + y, o = (y * w + x) * 4;
    out[o] = BRAND[0]; out[o + 1] = BRAND[1]; out[o + 2] = BRAND[2];
    out[o + 3] = keep(sx, sy) ? alphaAt(sx, sy) : 0;
  }
  return sharp(out, { raw: { width: w, height: h, channels: 4 } });
}
// Measured on the 3616×1216 original: lettering + camel span x 565–3082, y 324–883.
const scale = width / 3616;
const box = (l, t, r, b) => ({ left: Math.round(l * scale), top: Math.round(t * scale), right: Math.round(r * scale), bottom: Math.round(b * scale) });
const isCamel = (x, y) => x >= 2235 * scale && (y < 600 * scale || x >= 2380 * scale);

await mkdir('public/brand', { recursive: true });
await extract(box(545, 304, 3102, 903)).png({ compressionLevel: 9 }).toFile('public/brand/bota-wordmark.png');
const camel = extract(box(2225, 304, 3102, 903), isCamel);
await camel.clone().png({ compressionLevel: 9 }).toFile('public/brand/bota-camel.png');

// Favicons: white camel on a brand-green rounded square.
const camelPng = await camel.clone().resize(360, 360, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const whiteCamel = await sharp(camelPng).linear([0, 0, 0], [255, 255, 255]).png().toBuffer();
const tile = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="rgb(${BRAND.join(',')})"/></svg>`);
for (const [file, size] of [['app/icon.png', 512], ['app/apple-icon.png', 180]]) {
  const mark = await sharp(whiteCamel).resize(Math.round(size * 0.84), Math.round(size * 0.84), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp(tile(size)).composite([{ input: mark, gravity: 'center' }]).png().toFile(file);
}
console.log('Brand marks written to public/brand and app/icon.png. Original logo untouched.');
