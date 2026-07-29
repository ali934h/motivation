import { jsonResponse } from '../../_lib/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, { status: 400 });
  }

  const { orderedIds } = body;
  if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'string')) {
    return jsonResponse({ error: 'orderedIds must be an array of strings' }, { status: 400 });
  }

  await env.MOTIVATION_KV.put('cards:order', JSON.stringify(orderedIds));

  return jsonResponse({ success: true });
}
