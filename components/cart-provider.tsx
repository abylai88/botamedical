'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type CartLine, lineKey } from '@/lib/types';
import { cartLineSchema } from '@/lib/validation';
import { useLocale } from './locale-provider';
type CartContext = { lines: CartLine[]; ready: boolean; notice: string; add: (line: CartLine) => boolean; update: (key: string, quantity: number) => void; remove: (key: string) => void; clear: () => void };
const Context = createContext<CartContext | null>(null);
const STORAGE = 'bota:cart:v1';
function readCart(raw: string | null): CartLine[] {
  try {
    const result = cartLineSchema.array().max(30).safeParse(JSON.parse(raw || '[]'));
    if (!result.success || new Set(result.data.map(lineKey)).size !== result.data.length) return [];
    return result.data;
  } catch { return []; }
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]); const [ready, setReady] = useState(false); const [notice, setNotice] = useState(''); const { t } = useLocale();
  useEffect(() => {
    try { setLines(readCart(localStorage.getItem(STORAGE))); } catch { setNotice(t.purchase.storage); }
    setReady(true);
    const sync = (e: StorageEvent) => { if (e.key === STORAGE) setLines(readCart(e.newValue)); };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  function save(next: CartLine[]) { setLines(next); try { localStorage.setItem(STORAGE, JSON.stringify(next)); } catch { setNotice(t.purchase.saveFailed); } }
  function add(line: CartLine) {
    const existing = lines.find(l => lineKey(l) === lineKey(line));
    if ((!existing && lines.length >= 30) || (existing?.quantity || 0) + line.quantity > 20) { setNotice(t.purchase.limit); return false; }
    save(existing ? lines.map(l => lineKey(l) === lineKey(line) ? { ...l, quantity: l.quantity + line.quantity } : l) : [...lines, line]); return true;
  }
  return <Context.Provider value={{ lines, ready, notice, add, update: (key, quantity) => save(lines.map(l => lineKey(l) === key ? { ...l, quantity: Number.isFinite(quantity) ? Math.min(20, Math.max(1, Math.trunc(quantity))) : 1 } : l)), remove: key => save(lines.filter(l => lineKey(l) !== key)), clear: () => save([]) }}>{children}</Context.Provider>;
}
export function useCart() { const value = useContext(Context); if (!value) throw new Error('Missing CartProvider'); return value; }
