export async function api<T = { ok: boolean }>(url: string, method: string, data?: unknown): Promise<T> {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-bota-request': '1' }, body: data === undefined ? undefined : JSON.stringify(data), cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Запрос не выполнен. Попробуйте ещё раз.');
  return body;
}
// Uploads one image file through the admin media route and returns its /media URL.
export async function uploadImage(file: File): Promise<string> {
  if (file.size > 6 * 1024 * 1024) throw new Error('Максимальный размер изображения — 6 МБ.');
  const response = await fetch('/api/admin/media', { method: 'POST', headers: { 'x-bota-request': '1', 'Content-Type': 'application/octet-stream' }, body: file });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Не удалось загрузить изображение.');
  return result.url;
}
