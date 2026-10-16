export type Product = {
  id: string; name: string; description: string; category: string;
  price: number; sizes: string[]; colors: string[]; images: string[];
  active: boolean; revision: number;
};
export type CartLine = { productId: string; size: string; color: string; quantity: number };
export type OrderLine = CartLine & { name: string; price: number };
export type Order = {
  id: string; createdAt: string; status: 'new' | 'reviewed' | 'cancelled'; total: number;
  customer: { name: string; phone: string; email: string; note: string };
  items: OrderLine[];
};
export function money(cents: number) {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(cents / 100)} у. е.`;
}
export function lineKey(line: CartLine) { return JSON.stringify([line.productId, line.size, line.color]); }
