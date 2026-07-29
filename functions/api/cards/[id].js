import { jsonResponse } from '../../_lib/auth.js';
import { deleteCloudinaryImage } from '../../_lib/cloudinary.js';

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { id } = params;

  const existingRaw = await env.MOTIVATION_KV.get(`card:${id}`);
  if (!existingRaw) {
    return jsonResponse({ error: 'Card not found' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, { status: 400 });
  }

  const existing = JSON.parse(existingRaw);
  const text = typeof body.text === 'string' ? body.text.trim() : existing.text;
  const imageUrl =
    typeof body.imageUrl === 'string' ? body.imageUrl.trim() : existing.imageUrl;
  const imagePublicId =
    typeof body.imagePublicId === 'string'
      ? body.imagePublicId.trim()
      : existing.imagePublicId || '';

  if (!text && !imageUrl) {
    return jsonResponse(
      { error: 'A card needs at least text or an image' },
      { status: 400 }
    );
  }

  // If the image was replaced or removed, clean up the old Cloudinary
  // asset so it doesn't linger and eat into storage quota.
  const oldPublicId = existing.imagePublicId || '';
  if (oldPublicId && oldPublicId !== imagePublicId) {
    await deleteCloudinaryImage(env, oldPublicId);
  }

  const updated = { ...existing, text, imageUrl, imagePublicId, updatedAt: Date.now() };
  await env.MOTIVATION_KV.put(`card:${id}`, JSON.stringify(updated));

  return jsonResponse({ card: updated });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const { id } = params;

  const existingRaw = await env.MOTIVATION_KV.get(`card:${id}`);
  if (!existingRaw) {
    return jsonResponse({ error: 'Card not found' }, { status: 404 });
  }

  const existing = JSON.parse(existingRaw);
  if (existing.imagePublicId) {
    await deleteCloudinaryImage(env, existing.imagePublicId);
  }

  await env.MOTIVATION_KV.delete(`card:${id}`);

  const orderRaw = await env.MOTIVATION_KV.get('cards:order');
  const orderedIds = orderRaw ? JSON.parse(orderRaw) : [];
  const nextOrder = orderedIds.filter((cardId) => cardId !== id);
  await env.MOTIVATION_KV.put('cards:order', JSON.stringify(nextOrder));

  return jsonResponse({ success: true });
}
