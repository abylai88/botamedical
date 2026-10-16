export async function api<T = { ok: boolean }>(url: string, method: string, data?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-bota-request': '1' }, body: data === undefined ? undefined : JSON.stringify(data), cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Запрос не выполнен. Попробуйте ещё раз.');
  return body;
}
