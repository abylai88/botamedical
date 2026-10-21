import { NextRequest } from 'next/server';
import { authorize, mutation, jsonBody, json, failure } from '@/lib/http';
import { validateImages } from '@/lib/media';
import { saveSiteContent, siteSchema } from '@/lib/site';
export async function PUT(request: NextRequest) {
  try {
    authorize(request); mutation(request);
    const input = siteSchema.parse(await jsonBody(request, 65536));
    validateImages(Object.values(input.images).filter((v): v is string => !!v));
    return json(saveSiteContent(input));
  } catch (e) { return failure(e); }
}
