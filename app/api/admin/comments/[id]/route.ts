import { NextRequest } from 'next/server';
import { z } from 'zod';
import { deleteComment, setCommentStatus } from '@/lib/comments';
import { authorize, mutation, jsonBody, json, failure, HttpError } from '@/lib/http';
import { commentStatusSchema } from '@/lib/validation';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(request); mutation(request);
    const id = z.uuid().parse((await params).id);
    const { status } = commentStatusSchema.parse(await jsonBody(request));
    if (!setCommentStatus(id, status)) throw new HttpError(404, 'Комментарий не найден.');
    return json({ ok: true });
  } catch (e) { return failure(e); }
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(request); mutation(request);
    const id = z.uuid().parse((await params).id);
    if (!deleteComment(id)) throw new HttpError(404, 'Комментарий не найден.');
    return json({ ok: true });
  } catch (e) { return failure(e); }
}
