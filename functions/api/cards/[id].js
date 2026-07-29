import { jsonResponse } from '../../_lib/auth.js';

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

  if (!text && !imageUrl) {
    return jsonResponse(
      { error: 'A card needs at least text or an image' },
      { status: 400 }
    );
  }

  const updated = { ...existing, text, imageUrl, updatedAt: Date.now() };
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

  await env.MOTIVATION_KV.delete(`card:${id}`);

  const orderRaw = await env.MOTIVATION_KV.get('cards:order');
  const orderedIds = orderRaw ? JSON.parse(orderRaw) : [];
  const nextOrder = orderedIds.filter((cardId) => cardId !== id);
  await env.MOTIVATION_KV.put('cards:order', JSON.stringify(nextOrder));

  return jsonResponse({ success: true });
}
