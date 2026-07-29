import { jsonResponse } from '../../_lib/auth.js';

async function getOrderedCardIds(env) {
  const raw = await env.MOTIVATION_KV.get('cards:order');
  return raw ? JSON.parse(raw) : [];
}

export async function onRequestGet(context) {
  const { env } = context;
  const orderedIds = await getOrderedCardIds(env);

  const cards = [];
  for (const id of orderedIds) {
    const raw = await env.MOTIVATION_KV.get(`card:${id}`);
    if (raw) cards.push(JSON.parse(raw));
  }

  return jsonResponse({ cards });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, { status: 400 });
  }

  const { text, imageUrl } = body;
  const trimmedText = typeof text === 'string' ? text.trim() : '';
  const finalImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';

  if (!trimmedText && !finalImageUrl) {
    return jsonResponse(
      { error: 'A card needs at least text or an image' },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const card = {
    id,
    text: trimmedText,
    imageUrl: finalImageUrl,
    createdAt: Date.now(),
  };

  await env.MOTIVATION_KV.put(`card:${id}`, JSON.stringify(card));

  const orderedIds = await getOrderedCardIds(env);
  orderedIds.push(id);
  await env.MOTIVATION_KV.put('cards:order', JSON.stringify(orderedIds));

  return jsonResponse({ card }, { status: 201 });
}
