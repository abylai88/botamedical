import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { db, product, encrypt, digest, rateLimit } from '@/lib/db';
import { mutation, jsonBody, json, failure, HttpError } from '@/lib/http';
import { clientIp } from '@/lib/client-ip';
import { orderSchema } from '@/lib/validation';
import { lineKey } from '@/lib/types';
export async function POST(request: NextRequest) {
  try {
    mutation(request);
    const input = orderSchema.parse(await jsonBody(request));
    const requestHash = digest(JSON.stringify(input));
    const existing = db().prepare('SELECT id,request_hash FROM orders WHERE request_id=?').get(input.requestId) as { id: string; request_hash: string } | undefined;
    if (existing) {
      if (existing.request_hash !== requestHash) throw new HttpError(409, 'Содержимое заказа изменилось. Обновите страницу.');
      return json({ id: existing.id });
    }
    if (new Set(input.items.map(lineKey)).size !== input.items.length) throw new HttpError(400, 'Повторяющиеся позиции в корзине.');
    const items = input.items.map(item => {
      const p = product(item.productId);
      if (!p || !p.active) throw new HttpError(409, 'Товар больше недоступен. Вернитесь в корзину.');
      if (p.price !== item.expectedPrice) throw new HttpError(409, 'Цена изменилась. Обновите корзину перед оформлением.');
      if (!(p.sizes.length ? p.sizes.includes(item.size) : item.size === '') || !(p.colors.length ? p.colors.includes(item.color) : item.color === '')) throw new HttpError(400, 'Выбранные варианты недоступны. Добавьте товар заново.');
      return { productId: p.id, name: p.name, price: p.price, quantity: item.quantity, size: item.size, color: item.color };
    });
    // Counted only for orders that are about to be saved: retries and rejected carts do not use up the limit.
    if (!rateLimit('orders-global', 300, 10 * 60_000)) throw new HttpError(429, 'Слишком много запросов. Подождите несколько минут.');
    if (!rateLimit(`orders-ip:${clientIp(request.headers)}`, 20, 10 * 60_000)) throw new HttpError(429, 'Слишком много заказов. Подождите несколько минут.');
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const id = randomUUID();
    db().prepare('INSERT INTO orders VALUES (?,?,?,?,?,?)').run(id, input.requestId, requestHash, new Date().toISOString(), 'new', encrypt({ customer: input.customer, items, total }));
    return json({ id }, 201);
  } catch (e) { return failure(e); }
}
