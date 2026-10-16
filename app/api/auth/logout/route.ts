import { NextRequest } from 'next/server';
import { db, digest } from '@/lib/db';
import { COOKIE } from '@/lib/auth';
import { mutation, json, failure } from '@/lib/http';
export async function POST(request: NextRequest) {
  try {
    mutation(request);
    const token = request.cookies.get(COOKIE)?.value;
    if (token) db().prepare('DELETE FROM sessions WHERE hash=?').run(digest(token));
    const response = json({ ok: true }); response.cookies.delete(COOKIE); return response;
  } catch (e) { return failure(e); }
}
