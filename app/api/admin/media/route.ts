import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { NextRequest } from 'next/server';
import { db, dataDir, rateLimit } from '@/lib/db';
import { authorize, mutation, limitedBody, json, failure, HttpError } from '@/lib/http';
export async function POST(request: NextRequest) {
  try {
    authorize(request); mutation(request);
    if (!rateLimit('uploads', 30, 60_000)) throw new HttpError(429, 'Подождите минуту перед следующей загрузкой.');
    const buffer = await limitedBody(request, 6 * 1024 * 1024);
    let image: Buffer;
    try {
      const pipeline = sharp(buffer, { limitInputPixels: 24_000_000, failOn: 'warning' });
      const meta = await pipeline.metadata();
      if (!['jpeg', 'png', 'webp'].includes(meta.format || '') || (meta.pages || 1) !== 1 || !meta.width || !meta.height || Math.min(meta.width, meta.height) < 64 || Math.max(meta.width, meta.height) > 6000) throw new Error('Invalid image');
      image = await pipeline.rotate().resize({ width: 2000, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer();
    } catch { throw new HttpError(400, 'Нужен статичный JPG, PNG или WebP: до 6 МБ, от 64 до 6000 px, не более 24 Мп.'); }
    const name = `${randomUUID()}.webp`;
    await mkdir(join(dataDir, 'uploads'), { recursive: true, mode: 0o700 });
    await writeFile(join(dataDir, 'uploads', name), image, { flag: 'wx', mode: 0o600 });
    db().prepare('INSERT INTO media VALUES (?,?)').run(name, new Date().toISOString());
    return json({ url: `/media/${name}` }, 201);
  } catch (e) { return failure(e); }
}
