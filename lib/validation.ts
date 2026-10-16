import { z } from 'zod';
const text = (min: number, max: number) => z.string().trim().min(min).max(max).refine(s => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s));
export const idSchema = z.string().regex(/^[a-zA-Z0-9-]{1,64}$/);
const options = z.array(text(1, 40)).max(20).refine(a => new Set(a).size === a.length, 'Повторяющиеся варианты');
export const productSchema = z.object({
  name: text(2, 120), description: text(0, 3000), category: text(2, 60),
  price: z.number().int().min(1).max(100_000_000), sizes: options, colors: options,
  images: z.array(z.string().regex(/^\/(?:images\/[a-z0-9-]+\.webp|media\/[a-f0-9-]{36}\.webp)$/)).max(8),
  active: z.boolean(), revision: z.number().int().min(0),
}).strict();
export const cartLineSchema = z.object({
  productId: idSchema, size: text(0, 40), color: text(0, 40), quantity: z.number().int().min(1).max(20),
}).strict();
export const orderSchema = z.object({
  requestId: z.uuid(),
  items: z.array(cartLineSchema.extend({ expectedPrice: z.number().int().positive() })).min(1).max(30),
  customer: z.object({ name: text(2, 100), phone: text(7, 30).refine(s => /^[+\d\s()-]+$/.test(s) && s.replace(/\D/g, '').length >= 7), email: z.union([z.email().max(160), z.literal('')]), note: text(0, 1000) }).strict(),
  consent: z.literal(true),
}).strict();
export const loginSchema = z.object({ username: text(3, 64).transform(s => s.toLowerCase()), password: z.string().min(1).max(128) }).strict();
