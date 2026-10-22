import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { authorize, mutation, jsonBody, json, failure, HttpError } from '@/lib/http';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(request); mutation(request);
    const id = z.uuid().parse((await params).id);
    const { status } = z.object({ status: z.enum(['new', 'reviewed', 'cancelled']) }).strict().parse(await jsonBody(request));
    // Only the owner moves orders; 'spam' is set by the server, the panel can only release it to 'new'.
    const result = db().prepare('UPDATE orders SET status=? WHERE id=?').run(status, id);
    if (!result.changes) throw new HttpError(404, 'Заказ не найден.');
    return json({ ok: true });
  } catch (e) { return failure(e); }
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    authorize(request); mutation(request); const id = z.uuid().parse((await params).id);
    db().prepare('DELETE FROM orders WHERE id=?').run(id); return json({ ok: true });
  } catch (e) { return failure(e); }
}
