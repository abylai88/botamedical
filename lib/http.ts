import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { COOKIE, session } from './auth.ts';
import { appOrigin, publicDemo } from './deployment.ts';
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export function origin() {
  return appOrigin();
}
export function mutation(request: NextRequest) {
  if (publicDemo()) throw new HttpError(403, 'В публичной демонстрации изменения и приём заказов отключены.');
  if (request.headers.get('origin') !== origin() || request.headers.get('x-bota-request') !== '1' || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError(403, 'Запрос отклонён. Откройте сайт по его локальному адресу.');
}
export function authorize(request: NextRequest) {
  if (publicDemo()) throw new HttpError(403, 'Административная панель в публичной демонстрации недоступна.');
  const admin = session(request.cookies.get(COOKIE)?.value);
  if (!admin) throw new HttpError(401, 'Войдите в панель управления.');
  return admin;
}
export async function limitedBody(request: NextRequest, limit = 32768) {
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, 'Слишком большой запрос.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Пустой запрос.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new HttpError(413, 'Слишком большой запрос.'); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: NextRequest, limit?: number) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Ожидается JSON.');
  try { return JSON.parse((await limitedBody(request, limit)).toString('utf8')); }
  catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, 'Некорректный JSON.'); }
}
export function json(value: unknown, status = 200) { return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } }); }
export function failure(error: unknown) {
  if (error instanceof ZodError) return json({ error: 'Проверьте заполнение полей.', fields: error.issues.map(i => ({ path: i.path.join('.'), message: 'Проверьте значение.' })) }, 400);
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  console.error('BOTA request failed:', error instanceof Error ? error.name : 'UnknownError');
  return json({ error: 'Не удалось сохранить изменения. Повторите попытку.' }, 500);
}
