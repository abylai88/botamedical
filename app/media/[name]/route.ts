import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { db, dataDir } from '@/lib/db';
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(name) || !db().prepare('SELECT name FROM media WHERE name=?').get(name)) return new Response(null, { status: 404 });
  try {
    const bytes = await readFile(join(dataDir, 'uploads', name));
    return new Response(bytes, { headers: { 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable' } });
  } catch { return new Response(null, { status: 404 }); }
}
