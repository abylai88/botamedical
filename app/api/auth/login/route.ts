import { NextRequest } from 'next/server';
import { db, rateLimit, reserveLoginAttempt, clearLoginAttempts } from '@/lib/db';
import { verifyPassword, createSession, COOKIE, SESSION_SECONDS } from '@/lib/auth';
import { mutation, jsonBody, json, failure, HttpError, origin } from '@/lib/http';
import { clientIp } from '@/lib/client-ip';
import { loginSchema } from '@/lib/validation';
const WINDOW = 15 * 60_000;
const tooMany = (wait = 'Подождите 15 минут.') => new HttpError(429, `Слишком много попыток. ${wait}`);
export async function POST(request: NextRequest) {
  try {
    mutation(request);
    const input = loginSchema.parse(await jsonBody(request));
    const ip = clientIp(request.headers);
    // Order matters: per-address checks first, so requests they reject never touch the shared counters.
    // One address trying many usernames.
    if (!rateLimit(`login-ip:${ip}`, 30, WINDOW)) throw tooMany();
    // One address guessing one username: growing delay. The owner on another address is not affected.
    const attempt = `login-user:${input.username}|${ip}`;
    const wait = reserveLoginAttempt(attempt);
    if (wait) throw tooMany(`Подождите ${wait} сек.`);
    // Many addresses guessing one username.
    if (!rateLimit(`login-user-all:${input.username}`, 200, 60 * 60_000)) throw tooMany();
    // Emergency brake for a flood from many addresses; normal use never reaches it.
    if (!rateLimit('login-global', 1000, WINDOW)) throw tooMany();
    const admin = db().prepare('SELECT password FROM admins WHERE username=?').get(input.username) as { password: string } | undefined;
    if (!await verifyPassword(input.password, admin?.password)) throw new HttpError(401, 'Неверное имя пользователя или пароль.');
    clearLoginAttempts(attempt);
    const response = json({ ok: true });
    response.cookies.set(COOKIE, createSession(input.username), { httpOnly: true, secure: origin().startsWith('https:'), sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS });
    return response;
  } catch (e) { return failure(e); }
}
