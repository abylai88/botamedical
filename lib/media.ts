import 'server-only';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { db } from './db.ts';
import { HttpError } from './http.ts';
export function validateImages(images: string[]) {
  for (const image of images) {
    const valid = image.startsWith('/images/') ? existsSync(join(process.cwd(), 'public', image)) : db().prepare('SELECT name FROM media WHERE name=?').get(image.slice('/media/'.length));
    if (!valid) throw new HttpError(400, 'Изображение не найдено. Загрузите его заново.');
  }
}
