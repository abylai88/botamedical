import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { db, products } from '@/lib/db';
import { authorize, mutation, jsonBody, json, failure, HttpError } from '@/lib/http';
import { productSchema } from '@/lib/validation';
import { validateImages } from '@/lib/media';
export async function GET(request: NextRequest) {
  try { authorize(request); return json(products(true)); } catch (e) { return failure(e); }
}
export async function POST(request: NextRequest) {
  try {
    authorize(request); mutation(request);
    if (products(true).length >= 500) throw new HttpError(409, 'Достигнут лимит локального каталога (500).');
    const input = productSchema.parse(await jsonBody(request)); validateImages(input.images);
    const result = { ...input, id: randomUUID(), revision: 1 };
    db().prepare('INSERT INTO products VALUES (?,?)').run(result.id, JSON.stringify(result));
    return json(result, 201);
  } catch (e) { return failure(e); }
}
