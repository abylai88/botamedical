export type Product = {
  id: string; name: string; description: string; category: string;
  price: number; sizes: string[]; colors: string[]; images: string[];
  active: boolean; revision: number;
  nameEn?: string; descriptionEn?: string; categoryEn?: string;
};
export type ProductComment = {
  id: string; productId: string; author: string; body: string;
  createdAt: string; status: 'published' | 'hidden'; staff: boolean;
};
export type CartLine = { productId: string; size: string; color: string; quantity: number };
export type OrderLine = CartLine & { name: string; price: number };
export type Order = {
  id: string; createdAt: string; status: 'new' | 'reviewed' | 'cancelled' | 'spam'; total: number;
  // Set only for orders quarantined as spam: why the server flagged it.
  spamReason?: 'honeypot' | 'invalid';
  // Time of the customer's consent to data processing and the privacy policy edition. Missing on orders placed before it was recorded.
  consentAt?: string; privacyVersion?: string;
  customer: { name: string; phone: string; email: string; note: string };
  items: OrderLine[];
};
export { money } from './i18n.ts';
export function lineKey(line: CartLine) { return JSON.stringify([line.productId, line.size, line.color]); }
