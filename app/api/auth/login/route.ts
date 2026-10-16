import { NextRequest } from 'next/server';
import { db, rateLimit } from '@/lib/db';
import { verifyPassword, createSession, COOKIE, SESSION_SECONDS } from '@/lib/auth';
import { mutation, jsonBody, json, failure, HttpError, origin } from '@/lib/http';
import { loginSchema } from '@/lib/validation';
export async function POST(request: NextRequest) {
  try {
    mutation(request);
    if (!rateLimit('login-global', 30, 15 * 60_000)) throw new HttpError(429, 'Слишком много попыток. Подождите 15 минут.');
    const input = loginSchema.parse(await jsonBody(request));
    if (!rateLimit(`login:${input.username}`, 5, 15 * 60_000)) throw new HttpError(429, 'Слишком много попыток. Подождите 15 минут.');
    const admin = db().prepare('SELECT password FROM admins WHERE username=?').get(input.username) as { password: string } | undefined;
    if (!await verifyPassword(input.password, admin?.password)) throw new HttpError(401, 'Неверное имя пользователя или пароль.');
    const response = json({ ok: true });
    response.cookies.set(COOKIE, createSession(input.username), { httpOnly: true, secure: origin().startsWith('https:'), sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS });
    return response;
  } catch (e) { return failure(e); }
}
