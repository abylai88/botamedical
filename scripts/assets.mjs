import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const sourceImages = (await readdir('catalog')).filter(n => n.endsWith('.png')).sort();
const sources = [
  { source: `hero-coat/${(await readdir('hero-coat'))[0]}`, name: 'coat', width: 1700 },
  ...sourceImages.map((name, i) => ({ source: `catalog/${name}`, name: `look-0${i + 1}`, width: 1200 })),
  { source: `logo.jpg/${(await readdir('logo.jpg'))[0]}`, name: 'logo', width: 720 },
];
await mkdir('public/images', { recursive: true });
const manifest = [];
for (const asset of sources) {
  const original = await readFile(asset.source);
  let pipeline = sharp(original).rotate();
  if (asset.name === 'logo') pipeline = pipeline.extract({ left: 500, top: 270, width: 2640, height: 660 });
  const copy = await pipeline.resize({ width: asset.width, withoutEnlargement: true }).webp({ quality: asset.name === 'logo' ? 95 : 88 }).toBuffer();
  const target = `public/images/${asset.name}.webp`;
  await writeFile(target, copy);
  manifest.push({ original: asset.source, originalSha256: createHash('sha256').update(original).digest('hex'), optimized: target, bytes: copy.length });
}
await writeFile('docs/assets-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Created ${manifest.length} optimized copies. Original files preserved.`);
