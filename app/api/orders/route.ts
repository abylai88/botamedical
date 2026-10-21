import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { db, product, encrypt, digest, rateLimit, purgeOldSpam } from '@/lib/db';
import { mutation, jsonBody, json, failure, HttpError } from '@/lib/http';
import { clientIp } from '@/lib/client-ip';
import { checkFormToken, formTokenUsed, markFormTokenUsed } from '@/lib/form-token';
import { orderSchema } from '@/lib/validation';
import { lineKey } from '@/lib/types';
const refresh = 'Страница оформления устарела. Обновите страницу и отправьте заказ ещё раз.';
export async function POST(request: NextRequest) {
  try {
    mutation(request);
    const { website, formToken, ...input } = orderSchema.parse(await jsonBody(request));
    const token = checkFormToken(formToken);
    // Honeypot or a missing/forged token: kept in quarantine (status "spam") for the owner to review.
    const spamReason = website ? 'honeypot' : token === 'invalid' ? 'invalid' : undefined;
    // A person who clicks very fast is not a bot: ask to retry, keep the cart.
    if (!spamReason && token === 'fast') throw new HttpError(400, 'Подождите пару секунд и нажмите «Отправить» ещё раз.');
    if (!spamReason && token === 'expired') throw new HttpError(400, refresh);
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
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const ip = clientIp(request.headers);
    const id = randomUUID();
    if (spamReason) {
      // The bot sees the usual answer. Over the quarantine limits nothing more is stored.
      purgeOldSpam();
      if (rateLimit(`spam-ip:${ip}`, 5, 60 * 60_000) && rateLimit('spam-global', 500, 24 * 60 * 60_000)) {
        db().prepare('INSERT INTO orders(id,request_id,request_hash,created,status,payload) VALUES (?,?,?,?,?,?)').run(id, input.requestId, requestHash, new Date().toISOString(), 'spam', encrypt({ customer: input.customer, items, total, spamReason }));
      }
      console.warn('BOTA order quarantined as spam:', spamReason);
      return json({ id }, 201);
    }
    if (formTokenUsed(formToken!)) throw new HttpError(400, refresh);
    // Counted only for orders that are about to be saved: retries and rejected carts do not use up the limit.
    if (!rateLimit('orders-global', 300, 10 * 60_000)) throw new HttpError(429, 'Слишком много запросов. Подождите несколько минут.');
    if (!rateLimit(`orders-ip:${ip}`, 5, 60 * 60_000)) throw new HttpError(429, 'Слишком много заказов за час. Напишите нам в WhatsApp или попробуйте позже.');
    const database = db();
    database.exec('BEGIN IMMEDIATE');
    try {
      markFormTokenUsed(formToken!);
      database.prepare('INSERT INTO orders(id,request_id,request_hash,created,status,payload) VALUES (?,?,?,?,?,?)').run(id, input.requestId, requestHash, new Date().toISOString(), 'new', encrypt({ customer: input.customer, items, total }));
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
    return json({ id }, 201);
  } catch (e) { return failure(e); }
}
