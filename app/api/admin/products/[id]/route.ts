import { NextRequest } from 'next/server';
import { db, product } from '@/lib/db';
import { authorize, mutation, jsonBody, json, failure, HttpError } from '@/lib/http';
import { idSchema, productSchema } from '@/lib/validation';
import { validateImages } from '@/lib/media';
import { deleteProductComments } from '@/lib/comments';
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(request); mutation(request);
    const id = idSchema.parse((await params).id);
    const input = productSchema.parse(await jsonBody(request)); validateImages(input.images);
    const current = product(id); if (!current) throw new HttpError(404, 'Товар не найден.');
    if (input.revision !== current.revision) throw new HttpError(409, 'Товар уже изменён. Обновите страницу и повторите редактирование.');
    const result = { ...input, id, revision: current.revision + 1 };
    db().prepare('UPDATE products SET data=? WHERE id=?').run(JSON.stringify(result), id);
    return json(result);
  } catch (e) { return failure(e); }
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(request); mutation(request); const id = idSchema.parse((await params).id);
    if (!product(id)) throw new HttpError(404, 'Товар не найден.');
    db().prepare('DELETE FROM products WHERE id=?').run(id); deleteProductComments(id); return json({ ok: true });
  } catch (e) { return failure(e); }
}
