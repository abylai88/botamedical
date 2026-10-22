import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { db, product, encrypt, digest, rateLimit, purgeOldSpam, hasOrderKey } from '@/lib/db';
import { mutation, jsonBody, json, failure, HttpError } from '@/lib/http';
import { clientIp } from '@/lib/client-ip';
import { checkFormToken, formTokenUsed, markFormTokenUsed } from '@/lib/form-token';
import { orderSchema } from '@/lib/validation';
import { lineKey } from '@/lib/types';
import { whatsappLink } from '@/lib/site';
import { PRIVACY_VERSION } from '@/lib/i18n';
const refresh = 'Страница оформления устарела. Обновите страницу и отправьте заказ ещё раз.';
// Rule for this route: 201 with an id only after the order is written to the database.
// When it cannot be stored, the customer gets an error and keeps the cart, plus the WhatsApp link.
const notAccepted = (error = 'Не удалось оформить заказ. Попробуйте позже или напишите нам в WhatsApp.', status = 429) => json({ error, whatsapp: whatsappLink() }, status);
export async function POST(request: NextRequest) {
  try {
    mutation(request);
    // Without the order key contacts cannot be stored encrypted, so no order is taken at all.
    if (!hasOrderKey()) { console.error('BOTA order rejected: order-key is missing. Create it with npm run key:create.'); return notAccepted(undefined, 503); }
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
    const id = randomUUID(), created = new Date().toISOString();
    // Proof of consent: when it was given and which edition of the privacy policy the customer saw.
    const consent = { consentAt: created, privacyVersion: PRIVACY_VERSION };
    if (spamReason) {
      // Stored for the owner to review; the bot sees the usual answer. A full quarantine is an error,
      // because a real customer could also land here and must not get a number for nothing.
      purgeOldSpam();
      if (!rateLimit(`spam-ip:${ip}`, 5, 60 * 60_000) || !rateLimit('spam-global', 500, 24 * 60 * 60_000)) return notAccepted();
      db().prepare('INSERT INTO orders(id,request_id,request_hash,created,status,payload) VALUES (?,?,?,?,?,?)').run(id, input.requestId, requestHash, created, 'spam', encrypt({ customer: input.customer, items, total, spamReason, ...consent }));
      console.warn('BOTA order quarantined as spam:', spamReason);
      return json({ id }, 201);
    }
    if (formTokenUsed(formToken!)) throw new HttpError(400, refresh);
    // Counted only for orders that are about to be saved: retries and rejected carts do not use up the limit.
    // The address limit goes first: orders it rejects never touch the shared emergency counter.
    if (!rateLimit(`orders-ip:${ip}`, 5, 60 * 60_000)) return notAccepted('Слишком много заказов за час. Напишите нам в WhatsApp или попробуйте позже.');
    if (!rateLimit('orders-global', 300, 10 * 60_000)) return notAccepted();
    const database = db();
    database.exec('BEGIN IMMEDIATE');
    try {
      markFormTokenUsed(formToken!);
      database.prepare('INSERT INTO orders(id,request_id,request_hash,created,status,payload) VALUES (?,?,?,?,?,?)').run(id, input.requestId, requestHash, created, 'new', encrypt({ customer: input.customer, items, total, ...consent }));
      database.exec('COMMIT');
    } catch (error) { database.exec('ROLLBACK'); throw error; }
    return json({ id }, 201);
  } catch (e) { return failure(e); }
}
