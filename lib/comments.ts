import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from './db.ts';
import type { ProductComment } from './types.ts';

type Row = { id: string; product_id: string; created: string; author: string; body: string; status: ProductComment['status']; staff: number };
const map = (row: Row): ProductComment => ({ id: row.id, productId: row.product_id, author: row.author, body: row.body, createdAt: row.created, status: row.status, staff: !!row.staff });

export function productComments(productId: string, includeHidden = false): ProductComment[] {
  return (db().prepare(`SELECT * FROM comments WHERE product_id=? ${includeHidden ? '' : "AND status='published'"} ORDER BY created DESC LIMIT 200`).all(productId) as Row[]).map(map);
}
export function recentComments(limit = 300): ProductComment[] {
  return (db().prepare('SELECT * FROM comments ORDER BY created DESC LIMIT ?').all(limit) as Row[]).map(map);
}
export function addComment(productId: string, input: { author: string; body: string }, staff: boolean): ProductComment {
  const comment: ProductComment = { id: randomUUID(), productId, author: input.author, body: input.body, createdAt: new Date().toISOString(), status: 'published', staff };
  db().prepare('INSERT INTO comments(id,product_id,created,author,body,status,staff) VALUES (?,?,?,?,?,?,?)')
    .run(comment.id, productId, comment.createdAt, comment.author, comment.body, comment.status, staff ? 1 : 0);
  return comment;
}
export function setCommentStatus(id: string, status: ProductComment['status']) {
  return db().prepare('UPDATE comments SET status=? WHERE id=?').run(status, id).changes > 0;
}
export function deleteComment(id: string) {
  return db().prepare('DELETE FROM comments WHERE id=?').run(id).changes > 0;
}
export function deleteProductComments(productId: string) {
  db().prepare('DELETE FROM comments WHERE product_id=?').run(productId);
}
export function latestPublished(limit = 3): ProductComment[] {
  return (db().prepare("SELECT * FROM comments WHERE status='published' ORDER BY created DESC LIMIT ?").all(limit) as Row[]).map(map);
}
