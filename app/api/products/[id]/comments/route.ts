import { NextRequest } from 'next/server';
import { product, rateLimit } from '@/lib/db';
import { COOKIE, session } from '@/lib/auth';
import { addComment } from '@/lib/comments';
import { mutation, jsonBody, json, failure, HttpError } from '@/lib/http';
import { clientIp } from '@/lib/client-ip';
import { commentHasLink, commentSchema, idSchema } from '@/lib/validation';

// Visitors leave a comment under a product or look; it appears immediately and
// the administrator can hide or delete it in the panel.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    mutation(request);
    const id = idSchema.parse((await params).id);
    const current = product(id);
    if (!current || !current.active) throw new HttpError(404, 'Товар не найден.');
    const input = commentSchema.parse(await jsonBody(request));
    if (input.website) throw new HttpError(400, 'Комментарий не принят.');
    if (commentHasLink(input.body) || commentHasLink(input.author)) throw new HttpError(400, 'Ссылки в комментариях не публикуются.');
    // Per-address limit first: comments it rejects never touch the shared counters below.
    if (!rateLimit(`comments-ip:${clientIp(request.headers)}`, 5, 10 * 60_000) || !rateLimit(`comments-author:${input.author.toLowerCase()}`, 5, 10 * 60_000) || !rateLimit(`comments:${id}`, 20, 10 * 60_000) || !rateLimit('comments-global', 60, 10 * 60_000)) {
      throw new HttpError(429, 'Слишком много комментариев. Попробуйте через несколько минут.');
    }
    const staff = !!session(request.cookies.get(COOKIE)?.value);
    return json(addComment(id, { author: input.author, body: input.body }, staff), 201);
  } catch (e) { return failure(e); }
}
